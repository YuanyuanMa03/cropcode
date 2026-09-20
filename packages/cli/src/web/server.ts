import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SessionManager,
  BUILTIN_SLASH_COMMANDS,
  createOpenAIClient,
  findProviderByBaseURL,
  forSurface,
  formatSlashCommandDescription,
  resolveCurrentSettings,
  type SessionEntry,
  type SessionManagerOptions,
  type SessionMessage,
  type UserPromptContent,
} from "@yuanyuanma03/cropcode-core";
import { findPendingAskUserQuestion } from "../ui/core/ask-user-question";
import { filterFileMentionItems, scanFileMentionItems, type FileMentionItem } from "../ui/core/file-mentions";

/** Reuse the terminal file-mention scan for the web composer, with a short cache. */
const FILE_INDEX_TTL_MS = 30_000;
const FILE_LOOKUP_LIMIT = 12;

export type WebSessionManager = Pick<
  SessionManager,
  | "getActiveSessionId"
  | "setActiveSessionId"
  | "getSession"
  | "listSessions"
  | "listSessionMessages"
  | "handleUserPrompt"
  | "interruptActiveSession"
  | "dispose"
  | "initMcpServers"
>;

export type WebServerOptions = {
  projectRoot: string;
  port?: number;
  createManager?: (options: SessionManagerOptions) => WebSessionManager;
  getSettings?: typeof resolveCurrentSettings;
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") {
    throw new HttpError(415, "请使用 JSON 请求。");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 262_144) throw new HttpError(413, "内容过长，请缩短输入后重试。");
    chunks.push(Buffer.from(chunk));
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "请求内容不是有效的 JSON 对象。");
  }
}

function loadAssets(): Map<string, { content: Buffer; type: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const roots = [join(here, "../../resources/web"), join(here, "../web"), join(here, "web")];
  const root = roots.find((directory) => existsSync(join(directory, "index.html")));
  if (!root) throw new Error("Web assets are missing. Run npm run build, or reinstall CropCode.");
  return new Map([
    ["/", { content: readFileSync(join(root, "index.html")), type: "text/html; charset=utf-8" }],
    ["/app.js", { content: readFileSync(join(root, "app.js")), type: "text/javascript; charset=utf-8" }],
    ["/style.css", { content: readFileSync(join(root, "style.css")), type: "text/css; charset=utf-8" }],
  ]);
}

/** One local workspace and one active turn, shared by connected browser tabs. */
export async function startWebServer(options: WebServerOptions) {
  const projectRoot = resolve(options.projectRoot);
  const getSettings = () => (options.getSettings ?? resolveCurrentSettings)(projectRoot);
  const assets = loadAssets();
  const secret = randomBytes(32).toString("hex");
  const clients = new Set<ServerResponse>();
  let port = 0;
  let busy = false;
  let shuttingDown = false;
  let cancelled = false;
  let error: string | null = null;
  let messages: SessionMessage[] = [];
  let live: { requestId: string; text: string } | null = null;
  let progress: { label: string; tokens?: string } | null = null;
  let output = "";
  let broadcastTimer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;
  let initializing: Promise<void> | null = null;
  let fileIndex: { items: FileMentionItem[]; at: number } | null = null;
  const manager = (options.createManager ?? ((config) => new SessionManager(config)))({
    projectRoot,
    createOpenAIClient: () => createOpenAIClient(projectRoot),
    getResolvedSettings: getSettings,
    renderMarkdown: (text) => text,
    onAssistantMessage: (message) => {
      if (!message.visible) return;
      const index = messages.findIndex((item) => item.id === message.id);
      if (index >= 0) messages[index] = message;
      else messages.push(message);
      if (message.role === "assistant" && !message.meta?.asThinking) live = null;
      scheduleBroadcast();
    },
    onSessionEntryUpdated: () => scheduleBroadcast(),
    onLlmTextDelta: (event) => {
      // Internal classification requests have no session ID and are not chat replies.
      if (!event.sessionId) return;
      if (live?.requestId !== event.requestId) live = { requestId: event.requestId, text: "" };
      live.text = (live.text + event.delta).slice(-100_000);
      scheduleBroadcast();
    },
    onLlmStreamProgress: (event) => {
      if (event.phase === "start") live = null;
      progress = event.phase === "end" ? null : { label: "正在生成", tokens: event.formattedTokens };
      scheduleBroadcast();
    },
    onLlmRetry: (event) => {
      live = null;
      progress = { label: `正在重新连接 · ${event.attempt}/${event.maxRetries}` };
      scheduleBroadcast();
    },
    onProcessStdout: (_pid, chunk) => {
      output = (output + chunk).slice(-50_000);
      scheduleBroadcast();
    },
  });

  function redact(text: string): string {
    const key = getSettings().apiKey;
    return key ? text.split(JSON.stringify(key).slice(1, -1)).join("[API Key hidden]") : text;
  }
  function selected(): SessionEntry | null {
    const id = manager.getActiveSessionId();
    return id ? manager.getSession(id) : null;
  }
  function reloadMessages() {
    const id = manager.getActiveSessionId();
    messages = id ? manager.listSessionMessages(id).filter((message) => message.visible) : [];
  }
  function snapshot() {
    const settings = getSettings();
    const entry = selected();
    const processList = Array.from(entry?.processes?.values() ?? []);
    return {
      projectRoot,
      model: settings.model,
      provider: findProviderByBaseURL(settings.baseURL)?.label ?? "自定义服务",
      configured: Boolean(settings.apiKey),
      busy,
      error,
      sessionId: manager.getActiveSessionId(),
      status: entry?.status ?? null,
      failReason: entry?.failReason ?? null,
      planMode: entry?.planMode ?? false,
      permissions: entry?.askPermissions ?? [],
      question: findPendingAskUserQuestion(messages, entry?.status ?? null),
      proposedPlan:
        !busy && entry?.planMode && entry.status === "completed"
          ? (entry.assistantReply?.match(/<proposed_plan>\s*([\s\S]*?)\s*<\/proposed_plan>/)?.[1] ?? null)
          : null,
      sessions: manager
        .listSessions()
        .map((item) => ({ id: item.id, summary: item.summary, status: item.status, updated: item.updateTime })),
      messages: messages.slice(-200).map((message) => ({
        id: message.id,
        role: message.role,
        thinking: Boolean(message.meta?.asThinking),
        content: (message.content ?? "").slice(0, 24_000),
        truncated: (message.content?.length ?? 0) > 24_000,
      })),
      earlierMessages: Math.max(0, messages.length - 200),
      live,
      progress: processList.length ? { label: `正在执行 · ${processList[0].command}` } : progress,
      output,
      tokens: entry?.usage?.total_tokens ?? null,
    };
  }
  function sendState(res: ServerResponse, data: string) {
    if (res.destroyed || res.writableLength > 8_000_000) {
      res.destroy();
      clients.delete(res);
      return;
    }
    res.write(`event: state\ndata: ${data}\n\n`);
  }
  function scheduleBroadcast() {
    if (shuttingDown || broadcastTimer) return;
    broadcastTimer = setTimeout(() => {
      broadcastTimer = undefined;
      const data = redact(JSON.stringify(snapshot()));
      for (const client of clients) sendState(client, data);
    }, 60);
  }
  function json(res: ServerResponse, status: number, data: unknown) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(redact(JSON.stringify(data)));
  }
  function assertIdle() {
    if (busy) throw new HttpError(409, "当前任务正在执行，请先停止或等待完成。");
  }
  function assertSession(body: Record<string, unknown>) {
    if (body.sessionId !== manager.getActiveSessionId()) {
      throw new HttpError(409, "当前会话已在另一页面切换，请等待页面刷新后重试。");
    }
  }
  function startPrompt(prompt: UserPromptContent) {
    assertIdle();
    if (!getSettings().apiKey)
      throw new HttpError(400, "尚未配置模型。请在终端运行 cropcode，通过 /login 配置后刷新此页。");
    busy = true;
    cancelled = false;
    error = null;
    live = null;
    output = "";
    progress = { label: "正在准备任务" };
    if (prompt.text && prompt.text !== "/continue") {
      messages.push({
        id: randomBytes(8).toString("hex"),
        sessionId: manager.getActiveSessionId() ?? "",
        role: "user",
        content: prompt.text,
        contentParams: null,
        messageParams: null,
        visible: true,
        compacted: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      });
    }
    scheduleBroadcast();
    running = (async () => {
      try {
        initializing ??= manager.initMcpServers().catch((reason) => {
          initializing = null;
          throw reason;
        });
        await initializing;
        if (shuttingDown || cancelled) return;
        await manager.handleUserPrompt(prompt);
      } catch (reason) {
        error = reason instanceof Error ? reason.message : String(reason);
      } finally {
        if (manager.getActiveSessionId()) reloadMessages();
        busy = false;
        live = null;
        progress = null;
        scheduleBroadcast();
      }
    })();
  }

  const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (req, res) => {
    void route(req, res).catch((reason) => {
      if (res.headersSent || res.destroyed) {
        res.destroy();
        return;
      }
      json(res, reason instanceof HttpError ? reason.status : 500, {
        error: reason instanceof HttpError ? reason.message : "本地服务处理失败，请检查终端及配置后重试。",
      });
    });
  });
  async function route(req: IncomingMessage, res: ServerResponse) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );
    const host = req.headers.host;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) throw new HttpError(403, "Invalid local host.");
    const origin = `http://${host}`;
    if (req.headers.origin && req.headers.origin !== origin) throw new HttpError(403, "Cross-origin request rejected.");
    if (req.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403, "Cross-site request rejected.");
    const url = new URL(req.url ?? "/", origin);
    if (req.method === "GET" && url.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && assets.has(url.pathname)) {
      const asset = assets.get(url.pathname)!;
      res.writeHead(200, { "Content-Type": asset.type });
      res.end(asset.content);
      return;
    }
    if (!url.pathname.startsWith("/api/")) throw new HttpError(404, "Not found.");
    if (req.method !== "GET" && req.method !== "POST") throw new HttpError(405, "Method not allowed.");
    if (req.method === "POST" && req.headers.origin !== origin) throw new HttpError(403, "Missing local origin.");
    const cookieName = `cropcode_web_${port}`;
    if (url.pathname === "/api/connect" && req.method === "POST") {
      const body = await readBody(req);
      if (typeof body.token !== "string" || !equalSecret(body.token, secret))
        throw new HttpError(401, "请使用终端显示的完整连接地址。");
      res.setHeader("Set-Cookie", `${cookieName}=${secret}; HttpOnly; SameSite=Strict; Path=/`);
      json(res, 200, { ok: true });
      return;
    }
    const token =
      (req.headers.cookie ?? "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1) ?? "";
    if (!equalSecret(token, secret)) throw new HttpError(401, "连接已失效，请重新打开终端显示的完整地址。");
    if (url.pathname === "/api/state" && req.method === "GET") {
      json(res, 200, snapshot());
      return;
    }
    if (url.pathname === "/api/commands" && req.method === "GET") {
      // The web composer menu is built from the shared slash-command registry;
      // only web-surface commands with a mapped action are exposed.
      json(res, 200, {
        commands: forSurface(BUILTIN_SLASH_COMMANDS, "web")
          .filter((item) => item.webAction)
          .map((item) => ({
            name: item.name,
            description: formatSlashCommandDescription(item.description),
            action: item.webAction,
          })),
      });
      return;
    }
    if (url.pathname === "/api/events" && req.method === "GET") {
      if (clients.size >= 12) throw new HttpError(429, "打开的页面过多，请关闭部分页面后重试。");
      res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.flushHeaders();
      clients.add(res);
      sendState(res, redact(JSON.stringify(snapshot())));
      const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15_000);
      res.on("close", () => {
        clients.delete(res);
        clearInterval(heartbeat);
      });
      return;
    }
    if (req.method !== "POST") throw new HttpError(404, "Not found.");
    const body = await readBody(req);
    assertSession(body);
    if (url.pathname === "/api/files") {
      // Read-only lookup for the composer reference menu; safe to serve while a task runs.
      if (typeof body.query !== "string" || body.query.length > 200) throw new HttpError(400, "Invalid file query.");
      const now = Date.now();
      if (!fileIndex || now - fileIndex.at > FILE_INDEX_TTL_MS) {
        fileIndex = { items: scanFileMentionItems(projectRoot), at: now };
      }
      json(res, 200, { items: filterFileMentionItems(fileIndex.items, body.query, FILE_LOOKUP_LIMIT) });
      return;
    }
    if (url.pathname === "/api/interrupt") {
      cancelled = true;
      manager.interruptActiveSession();
      json(res, 200, { ok: true });
      return;
    }
    assertIdle();
    if (url.pathname === "/api/session") {
      if (body.target !== null && (typeof body.target !== "string" || !manager.getSession(body.target)))
        throw new HttpError(404, "会话不存在。");
      manager.setActiveSessionId(body.target as string | null);
      reloadMessages();
      error = null;
      output = "";
      live = null;
      scheduleBroadcast();
      json(res, 200, snapshot());
      return;
    }
    if (url.pathname === "/api/prompt") {
      if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 32_000)
        throw new HttpError(400, "请输入 1–32000 字符的消息。");
      if (body.planMode !== undefined && typeof body.planMode !== "boolean")
        throw new HttpError(400, "Invalid Plan mode.");
      if (selected()?.status === "ask_permission") throw new HttpError(409, "请先处理待确认的权限请求。");
      startPrompt({
        text: body.text.trim(),
        planMode: body.planMode === true,
        isAnswers: selected()?.status === "waiting_for_user",
      });
    } else if (url.pathname === "/api/permission") {
      const entry = selected();
      const requests = entry?.askPermissions ?? [];
      if (entry?.status !== "ask_permission" || !requests.length) throw new HttpError(409, "权限请求已失效。");
      const ids = body.toolCallIds;
      if (
        !Array.isArray(ids) ||
        ids.length !== requests.length ||
        new Set(ids).size !== ids.length ||
        !requests.every((request) => ids.includes(request.toolCallId))
      )
        throw new HttpError(409, "权限请求已变化，请重新查看。");
      if (body.decision !== "allow" && body.decision !== "deny")
        throw new HttpError(400, "Invalid permission decision.");
      const permission = body.decision;
      startPrompt({
        text: "/continue",
        planMode: entry.planMode,
        permissions: requests.map((request) => ({ toolCallId: request.toolCallId, permission })),
      });
    } else throw new HttpError(404, "Not found.");
    json(res, 202, { accepted: true });
  }
  try {
    await new Promise<void>((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 8787, "127.0.0.1", () => {
        server.off("error", reject);
        resolveListen();
      });
    });
  } catch (reason) {
    manager.dispose();
    throw reason;
  }
  port = (server.address() as { port: number }).port;
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    url: `${origin}/#token=${secret}`,
    async close() {
      if (shuttingDown) return;
      shuttingDown = true;
      if (broadcastTimer) clearTimeout(broadcastTimer);
      manager.dispose();
      for (const client of clients) client.end();
      const closed = new Promise<void>((done) => server.close(() => done()));
      server.closeAllConnections();
      await closed;
      // Do not hold the HTTP listener open for an unresponsive model or external MCP.
      await Promise.race([
        running,
        new Promise<void>((done) => {
          const timer = setTimeout(done, 1000);
          timer.unref();
        }),
      ]);
    },
  };
}

export async function runWebMode(options: WebServerOptions): Promise<void> {
  try {
    const web = await startWebServer(options);
    process.stdout.write(
      `\nCropCode Web · ${resolve(options.projectRoot)}\n\n${web.url}\n\n在浏览器打开以上地址。Ctrl+C 停止本地服务。\n`
    );
    const stop = () => {
      void web.close().finally(() => process.exit(0));
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } catch (reason) {
    const code = (reason as NodeJS.ErrnoException).code;
    const message =
      code === "EADDRINUSE"
        ? `端口 ${options.port ?? 8787} 已被占用。请使用 cropcode web --port 8788。`
        : reason instanceof Error
          ? reason.message
          : String(reason);
    process.stderr.write(`CropCode Web: ${message}\n`);
    process.exitCode = 1;
  }
}

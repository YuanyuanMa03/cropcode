import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import type { SessionEntry, SessionMessage, UserPromptContent } from "@yuanyuanma03/cropcode-core";
import { startWebServer, type WebServerOptions } from "../web/server";

const settings = { model: "fixture-model", baseURL: "http://fixture.invalid/v1", apiKey: "fixture-private-key" };

type FixtureState = {
  busy: boolean;
  sessionId: string | null;
  planMode: boolean;
  status: string | null;
  messages: Array<{ content: string }>;
  sessions: Array<{ id: string }>;
};

// Deterministic manager fixture. No model requests, file writes, or real credentials.
async function fixture(t: TestContext, options: { init?: Promise<void>; configured?: boolean } = {}) {
  let active: string | null = null;
  let pending: (() => void) | null = null;
  let disposed = false;
  let callbacks: Parameters<NonNullable<WebServerOptions["createManager"]>>[0];
  const prompts: UserPromptContent[] = [];
  const entries = new Map<string, SessionEntry>();
  const messages = new Map<string, SessionMessage[]>();
  const server = await startWebServer({
    projectRoot: process.cwd(),
    port: 0,
    getSettings: () => ({ ...settings, apiKey: options.configured === false ? undefined : settings.apiKey }) as any,
    createManager: (config) => {
      callbacks = config;
      return {
        getActiveSessionId: () => active,
        setActiveSessionId: (id) => {
          active = id;
        },
        getSession: (id) => entries.get(id) ?? null,
        listSessions: () => [...entries.values()],
        listSessionMessages: (id) => messages.get(id) ?? [],
        initMcpServers: () => options.init ?? Promise.resolve(),
        dispose: () => {
          disposed = true;
          pending?.();
        },
        interruptActiveSession: () => {
          if (active) entries.get(active)!.status = "interrupted";
          pending?.();
        },
        handleUserPrompt: async (prompt) => {
          prompts.push(prompt);
          active ??= "session-" + (entries.size + 1);
          const id = active;
          const entry =
            entries.get(id) ??
            ({
              id,
              summary: prompt.text,
              status: "processing",
              planMode: false,
              processes: null,
              usage: null,
              updateTime: "2026-09-20",
            } as SessionEntry);
          entry.planMode = prompt.planMode;
          entries.set(id, entry);
          if (prompt.text !== "/continue") {
            messages.set(id, [
              ...(messages.get(id) ?? []),
              { id: "u-" + prompts.length, role: "user", content: prompt.text, visible: true } as SessionMessage,
            ]);
          }
          callbacks.onSessionEntryUpdated?.(entry);
          if (prompt.text === "wait")
            await new Promise<void>((done) => {
              pending = done;
            });
          if (prompt.text === "permission" && !prompt.permissions) {
            entry.status = "ask_permission";
            entry.askPermissions = [
              { toolCallId: "call-1", name: "write", command: "fixture.txt", scopes: ["write-in-cwd"] },
            ];
          } else if (entry.status !== "interrupted") {
            entry.status = "completed";
            entry.askPermissions = [];
            const reply = {
              id: "a-" + prompts.length,
              role: "assistant",
              content: "fixture reply " + settings.apiKey,
              visible: true,
            } as SessionMessage;
            messages.set(id, [...(messages.get(id) ?? []), reply]);
            callbacks.onAssistantMessage(reply, false);
          }
          callbacks.onSessionEntryUpdated?.(entry);
        },
      };
    },
  });
  t.after(() => server.close());
  const headers: Record<string, string> = { Origin: server.origin, "Content-Type": "application/json" };
  const connect = await fetch(server.origin + "/api/connect", {
    method: "POST",
    headers,
    body: JSON.stringify({ token: new URL(server.url).hash.slice(7) }),
  });
  assert.equal(connect.status, 200);
  headers.Cookie = connect.headers.get("set-cookie")!.split(";")[0];
  const post = (path: string, body: Record<string, unknown>) =>
    fetch(server.origin + path, { method: "POST", headers, body: JSON.stringify({ sessionId: active, ...body }) });
  const state = async () => (await (await fetch(server.origin + "/api/state", { headers })).json()) as FixtureState;
  const settled = async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const value = await state();
      if (!value.busy) return value;
      await delay(10);
    }
    throw new Error("Fixture did not settle");
  };
  return {
    ...server,
    headers,
    post,
    state,
    settled,
    prompts,
    entries,
    get active() {
      return active;
    },
    get disposed() {
      return disposed;
    },
  };
}

test("Web API requires authentication and same-origin requests; assets expose no credentials", async (t) => {
  const web = await fixture(t);
  const page = await fetch(web.origin);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy")!, /frame-ancestors 'none'/);
  assert.match(await page.text(), /CropCode/);
  assert.equal((await fetch(web.origin + "/api/state")).status, 401);
  assert.equal(
    (await fetch(web.origin + "/api/state", { headers: { ...web.headers, Origin: "https://example.invalid" } })).status,
    403
  );
  assert.equal(
    (
      await fetch(web.origin + "/api/session", {
        method: "POST",
        headers: { Cookie: web.headers.Cookie, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403
  );
  assert.equal((await web.post("/api/connect", { token: "wrong" })).status, 401);
  const raw = JSON.stringify(await web.state());
  assert.ok(!raw.includes(settings.apiKey));
  assert.ok(!raw.includes("apiKey"));
  assert.equal(
    (await fetch(web.origin + "/api/state", { headers: { ...web.headers, "Sec-Fetch-Site": "cross-site" } })).status,
    403
  );
  const status = await new Promise((done, reject) => {
    const req = httpRequest(
      web.origin + "/api/state",
      { headers: { Host: "rebinding.invalid", Cookie: web.headers.Cookie } },
      (res) => {
        res.resume();
        done(res.statusCode);
      }
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(status, 403);
});

test("Web chat preserves history, Plan mode and bounded output while redacting the provider key", async (t) => {
  const web = await fixture(t);
  assert.equal((await web.post("/api/prompt", { text: "你好", planMode: true })).status, 202);
  let state = await web.settled();
  const id = state.sessionId;
  assert.equal(state.planMode, true);
  assert.equal(state.messages[0].content, "你好");
  assert.match(state.messages[1].content, /API Key hidden/);
  assert.equal((await web.post("/api/session", { target: null })).status, 200);
  state = await web.state();
  assert.equal(state.sessionId, null);
  assert.equal(state.sessions.length, 1);
  assert.equal((await web.post("/api/session", { target: id })).status, 200);
  assert.equal((await web.state()).messages.length, 2);
  assert.equal((await web.post("/api/prompt", { sessionId: null, text: "stale tab" })).status, 409);
  assert.equal(web.prompts.length, 1);
});

test("Concurrent sends and switching are rejected; stopping cancels the active task", async (t) => {
  const web = await fixture(t);
  assert.equal((await web.post("/api/prompt", { text: "wait" })).status, 202);
  assert.equal((await web.state()).busy, true);
  assert.equal((await web.post("/api/prompt", { text: "duplicate" })).status, 409);
  assert.equal((await web.post("/api/session", { target: null })).status, 409);
  assert.equal((await web.post("/api/interrupt", {})).status, 200);
  assert.equal((await web.settled()).status, "interrupted");
  assert.equal(web.prompts.length, 1);
});

test("Stopping during MCP initialization does not start a delayed model request", async (t) => {
  let ready!: () => void;
  const web = await fixture(t, {
    init: new Promise<void>((done) => {
      ready = done;
    }),
  });
  await web.post("/api/prompt", { text: "hello" });
  await web.post("/api/interrupt", {});
  ready();
  assert.equal((await web.settled()).busy, false);
  assert.equal(web.prompts.length, 0);
});

test("Permission replies match pending tool IDs and preserve both allow and deny decisions", async (t) => {
  for (const decision of ["allow", "deny"]) {
    const web = await fixture(t);
    await web.post("/api/prompt", { text: "permission", planMode: true });
    assert.equal((await web.settled()).status, "ask_permission");
    assert.equal((await web.post("/api/prompt", { text: "skip permission" })).status, 409);
    assert.equal((await web.post("/api/permission", { toolCallIds: ["wrong"], decision })).status, 409);
    assert.equal((await web.post("/api/permission", { toolCallIds: ["call-1"], decision })).status, 202);
    await web.settled();
    assert.deepEqual(web.prompts[1].permissions, [{ toolCallId: "call-1", permission: decision }]);
    assert.equal(web.prompts[1].planMode, true);
    assert.equal((await web.post("/api/permission", { toolCallIds: ["call-1"], decision })).status, 409);
  }
});

test("SSE reconnect sends a current snapshot without replaying work, and shutdown releases the listener", async (t) => {
  const web = await fixture(t);
  await web.post("/api/prompt", { text: "hello" });
  await web.settled();
  for (let index = 0; index < 2; index++) {
    const abort = new AbortController();
    const response = await fetch(web.origin + "/api/events", { headers: web.headers, signal: abort.signal });
    assert.match(response.headers.get("content-type")!, /text\/event-stream/);
    const reader = response.body!.getReader();
    const chunk = await reader.read();
    const text = new TextDecoder().decode(chunk.value);
    assert.match(text, /event: state/);
    assert.match(text, /fixture reply/);
    assert.ok(!text.includes(settings.apiKey));
    abort.abort();
    await reader.cancel().catch(() => {});
  }
  assert.equal(web.prompts.length, 1);
  await web.close();
  assert.equal(web.disposed, true);
  await assert.rejects(() => fetch(web.origin));
});

test("Invalid input, missing model configuration and occupied ports produce useful errors", async (t) => {
  const web = await fixture(t);
  assert.equal((await web.post("/api/prompt", { text: " " })).status, 400);
  assert.equal((await web.post("/api/prompt", { text: "x".repeat(32_001) })).status, 400);
  assert.equal((await web.post("/api/prompt", { text: "ok", planMode: "true" })).status, 400);
  assert.equal((await web.post("/api/session", { target: "absent" })).status, 404);
  const malformed = await fetch(web.origin + "/api/prompt", { method: "POST", headers: web.headers, body: "{" });
  assert.equal(malformed.status, 400);
  const huge = await fetch(web.origin + "/api/prompt", {
    method: "POST",
    headers: web.headers,
    body: JSON.stringify({ text: "x".repeat(270_000) }),
  });
  assert.equal(huge.status, 413);
  const noModel = await fixture(t, { configured: false });
  assert.equal((await noModel.post("/api/prompt", { text: "hello" })).status, 400);
  assert.equal(noModel.prompts.length, 0);
  await assert.rejects(
    () =>
      startWebServer({
        projectRoot: process.cwd(),
        port: Number(new URL(web.origin).port),
        createManager: () => ({ dispose() {} }) as any,
      }),
    { code: "EADDRINUSE" }
  );
});

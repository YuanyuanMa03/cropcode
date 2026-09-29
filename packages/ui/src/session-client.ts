/** Browser-only contract for the local host. Credentials never enter this state. */
export type SessionSnapshot = {
  revision: number;
  projectRoot: string;
  model: string;
  provider: string;
  configured: boolean;
  busy: boolean;
  error: string | null;
  failReason: string | null;
  sessionId: string | null;
  status: string | null;
  planMode: boolean;
  permissions: Array<{ toolCallId: string; name: string; command: string; scopes: string[] }>;
  question: { messageId: string; questions: Array<{ question: string; options: Array<{ label: string }> }> } | null;
  proposedPlan: string | null;
  sessions: Array<{ id: string; summary: string; status: string; updated: string }>;
  messages: Array<{ id: string; role: string; thinking: boolean; content: string | null; truncated: boolean }>;
  earlierMessages: number;
  live: { requestId: string; text: string } | null;
  progress: { label: string } | null;
  output: string;
  tokens: number | null;
};
export type Command = { name: string; description: string; action: string };
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
export async function request<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error ?? "请求失败，请重试。", response.status);
  return data as T;
}

/** Full snapshots replace state; the revision rejects a late HTTP response after an SSE update. */
export function connectSession(
  onState: (state: SessionSnapshot) => void,
  onConnection: (connected: boolean, error?: string) => void
) {
  let generation = 0;
  let events: EventSource | undefined;
  let controller: AbortController | undefined;
  let acceptSnapshot: (state: SessionSnapshot) => void = () => {};
  const start = async () => {
    const current = ++generation;
    events?.close();
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    let revision = -1;
    const accept = (state: SessionSnapshot) => {
      if (current !== generation || state.revision <= revision) return;
      revision = state.revision;
      onState(state);
      onConnection(true);
    };
    acceptSnapshot = accept;
    onConnection(false);
    try {
      const token = new URLSearchParams(location.hash.slice(1)).get("token");
      if (token) {
        await request("/api/connect", { token }, signal);
        if (current !== generation) return;
        history.replaceState(null, "", location.pathname + location.search);
      }
      accept(await request<SessionSnapshot>("/api/state", undefined, signal));
      if (current !== generation) return;
      const stream = new EventSource("/api/events");
      events = stream;
      stream.addEventListener("state", (event) => accept(JSON.parse(event.data) as SessionSnapshot));
      stream.onerror = () => {
        if (current !== generation) return;
        onConnection(false, "连接中断，正在恢复…");
        void request("/api/state", undefined, signal).catch((error: unknown) => {
          if (current !== generation || signal.aborted) return;
          if (error instanceof RequestError && [401, 403].includes(error.status)) {
            stream.close();
            onConnection(false, "连接凭据已失效，请重新打开终端中的完整地址。");
          }
        });
      };
    } catch (error) {
      if (current !== generation || signal.aborted) return;
      onConnection(
        false,
        error instanceof RequestError && error.status === 401 ? "请打开终端打印的完整地址以连接工作区。" : String(error)
      );
    }
  };
  const hashChanged = () => {
    if (new URLSearchParams(location.hash.slice(1)).has("token")) void start();
  };
  const offline = () => {
    generation++;
    events?.close();
    controller?.abort();
    onConnection(false, "网络连接已断开，恢复后将自动重连。");
  };
  const online = () => {
    void start();
  };
  window.addEventListener("offline", offline);
  window.addEventListener("online", online);
  window.addEventListener("hashchange", hashChanged);
  void start();
  return {
    async refresh() {
      const current = generation;
      try {
        const state = await request<SessionSnapshot>("/api/state", undefined, controller?.signal);
        if (current === generation) acceptSnapshot(state);
      } catch {
        if (current === generation) onConnection(false, "连接中断，等待恢复后再操作。");
      }
    },
    close() {
      generation++;
      events?.close();
      controller?.abort();
      window.removeEventListener("hashchange", hashChanged);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    },
  };
}

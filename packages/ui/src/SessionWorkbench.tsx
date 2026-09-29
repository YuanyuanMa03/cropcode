import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, MoonIcon, PlusIcon, RowsIcon, StopIcon, SunIcon } from "@radix-ui/react-icons";
import { connectSession, request } from "./session-client";
import type { Command, SessionSnapshot } from "./session-client";

export function SessionWorkbench() {
  const [state, setState] = useState<SessionSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<Command[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("cropcode-theme") === "dark";
    } catch {
      return false;
    }
  });
  const end = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const key = state?.sessionId ?? "new";
  const draft = drafts[key] ?? "";
  const unavailable = !connected || pending || !state;
  const waiting = state?.status === "ask_permission";
  const setDraft = (value: string) => {
    setDrafts((previous) => ({ ...previous, [key]: value }));
    setDismissed(false);
  };
  const connection = useRef<ReturnType<typeof connectSession> | null>(null);
  useEffect(() => {
    const client = connectSession(setState, (ready, error) => {
      setConnected(ready);
      setConnectionNotice(error ?? "");
    });
    connection.current = client;
    return () => {
      client.close();
      connection.current = null;
    };
  }, []);
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void request<{ commands: Command[] }>("/api/commands", undefined, controller.signal)
      .then((data) => setCommands(data.commands))
      .catch(() => {});
    return () => controller.abort();
  }, [connected]);
  useEffect(() => {
    document.documentElement.dataset["theme"] = dark ? "dark" : "light";
    try {
      localStorage.setItem("cropcode-theme", dark ? "dark" : "light");
    } catch {
      /* Optional storage. */
    }
  }, [dark]);
  useEffect(() => {
    setPlan(state?.planMode ?? false);
  }, [state?.sessionId, state?.planMode]);
  useEffect(() => {
    if (follow.current) end.current?.scrollIntoView({ block: "end" });
  }, [state?.messages, state?.live, state?.permissions]);
  useEffect(() => {
    setChoices([]);
    setChoiceIndex(0);
    if (dismissed || !connected) return;
    if (/^\/\S*$/.test(draft)) {
      setChoices(
        commands.filter((command) => command.name.startsWith(draft.slice(1))).map((command) => `/${command.name}`)
      );
      return;
    }
    const match = draft.match(/(?:^|\s)@([^\s]*)$/);
    if (!match) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void request<{ items: Array<{ path: string }> }>(
        "/api/files",
        { sessionId: state?.sessionId ?? null, query: match[1] },
        controller.signal
      )
        .then((data) =>
          setChoices(data.items.map((item) => (/\s/.test(item.path) ? `@"${item.path}"` : `@${item.path}`)))
        )
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, dismissed, connected, commands, state?.sessionId]);

  const action = async (path: string, body: object): Promise<boolean> => {
    if (locked.current || !connected || !state) return false;
    locked.current = true;
    setPending(true);
    setNotice("");
    try {
      await request(path, { sessionId: state.sessionId, ...body });
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      await connection.current?.refresh();
      locked.current = false;
      setPending(false);
    }
  };
  const switchSession = async (target: string | null) => {
    if (await action("/api/session", { target })) {
      setSidebar(false);
      follow.current = true;
    }
  };
  const send = async () => {
    const text = draft.trim();
    const command = commands.find((item) => `/${item.name}` === text);
    if (!text || (command?.action !== "interrupt" && (state?.busy || waiting))) return;
    if (command?.action === "toggle-plan") {
      setPlan(!plan);
      setDraft("");
      return;
    }
    const path =
      command?.action === "new-session"
        ? "/api/session"
        : command?.action === "interrupt"
          ? "/api/interrupt"
          : "/api/prompt";
    if (await action(path, path === "/api/session" ? { target: null } : { text, planMode: plan })) {
      // Preserve text typed while the request was in flight and drafts belonging to other sessions.
      setDrafts((previous) => (previous[key] === draft ? { ...previous, [key]: "" } : previous));
      follow.current = true;
    }
  };
  const selectChoice = (choice: string) => {
    setDraft(draft.replace(/(?:@[^\s]*|^\/\S*)$/, choice) + " ");
    setDismissed(true);
    setChoices([]);
    input.current?.focus();
  };
  const title = state?.sessions.find((session) => session.id === state.sessionId)?.summary || "新建任务";
  return (
    <div className="live-root">
      <div className="app-shell">
        {sidebar && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setSidebar(false)} />}
        <aside
          className={`sidebar ${sidebar ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
          aria-label="项目与任务导航"
        >
          <div className="brand-row">
            <span className="brand">
              <span className="brand-mark">
                C<span />
              </span>
              CropCode
            </span>
            <span className="version-label">工作台</span>
          </div>
          <div className="nav-actions">
            <button
              className="nav-button"
              disabled={unavailable || state.busy}
              onClick={() => void switchSession(null)}
            >
              <PlusIcon />
              新建任务
            </button>
            <input
              className="live-search"
              aria-label="搜索任务"
              placeholder="搜索任务…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="nav-label">本机工作区</div>
          <div className="live-project" title={state?.projectRoot}>
            {state?.projectRoot.split(/[\\/]/).pop() ?? "正在连接…"}
          </div>
          <nav className="project-nav">
            {state?.sessions
              .filter((session) => session.summary.toLowerCase().includes(query.toLowerCase()))
              .map((session) => (
                <button
                  key={session.id}
                  title={session.summary}
                  className={`task-button ${state.sessionId === session.id ? "active" : ""}`}
                  disabled={unavailable || state.busy}
                  onClick={() => void switchSession(session.id)}
                >
                  <span className={session.status === "ask_permission" ? "waiting-dot" : "task-dot"} />
                  <span>{session.summary || "未命名任务"}</span>
                </button>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-note">
              <span className="local-indicator" />
              {connected ? "已连接本机内核" : "未连接"}
            </div>
            <a className="nav-button" href="/legacy">
              模型设置与旧版工作台
            </a>
            <div className="sidebar-footer">
              <span>CropCode</span>
              <button
                className="icon-button"
                aria-label={dark ? "切换浅色" : "切换深色"}
                onClick={() => setDark(!dark)}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </aside>
        <main className="workspace">
          <header className="workspace-header">
            <button
              className="icon-button"
              aria-label="切换项目导航"
              onClick={() => (window.innerWidth < 768 ? setSidebar(!sidebar) : setSidebarCollapsed(!sidebarCollapsed))}
            >
              <RowsIcon />
            </button>
            <div className="breadcrumbs">
              <span title={title}>{title}</span>
            </div>
            <span className="live-status" role="status">
              {!connected
                ? "连接中"
                : state?.busy
                  ? (state.progress?.label ?? "正在执行")
                  : waiting
                    ? "等待确认"
                    : state?.status === "interrupted"
                      ? "已中断"
                      : "就绪"}
            </span>
          </header>
          {connectionNotice && (
            <div className="live-notice" role="alert">
              {connectionNotice}
            </div>
          )}
          {notice && (
            <div className="live-notice" role="alert">
              {notice}
            </div>
          )}
          {state?.error && (
            <div className="live-notice" role="alert">
              {state.error}
            </div>
          )}
          {state?.failReason && state.status !== "interrupted" && (
            <div className="live-notice" role="alert">
              {state.failReason}
            </div>
          )}
          {state && !state.configured && (
            <div className="live-notice">
              尚未配置模型。请在<a href="/legacy">模型设置</a>或终端 /login 中配置后刷新。
            </div>
          )}
          <section
            className="conversation"
            aria-label="任务对话"
            onScroll={(event) => {
              const element = event.currentTarget;
              follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
            }}
          >
            <div className="conversation-inner">
              {!state?.messages.length && (
                <div className="new-task">
                  <span className="eyebrow">本机项目 · 农业科研助手</span>
                  <h1>今天想推进哪项研究？</h1>
                  <p>描述任务，或使用 @ 引用项目文件。执行修改前可先开启计划模式。</p>
                </div>
              )}
              {!!state?.earlierMessages && (
                <p className="live-muted">仅显示最近 200 条消息，较早消息仍保存在本机会话中。</p>
              )}
              {state?.messages.map((message) => (
                <article key={message.id} className={message.role === "user" ? "user-message" : "assistant-message"}>
                  <span className={`avatar ${message.role === "user" ? "user-avatar" : "crop-avatar"}`}>
                    {message.role === "user" ? "你" : "C"}
                  </span>
                  <div className="message-body">
                    <h2>
                      {message.role === "user" ? "你" : message.role === "tool" ? "工具结果" : "CropCode"}
                      {message.thinking && <span>思考</span>}
                    </h2>
                    {message.role === "tool" || message.thinking ? (
                      <details className="tool-row">
                        <summary>{message.thinking ? "查看思考过程" : "查看工具输出"}</summary>
                        <pre className="live-text">{message.content}</pre>
                      </details>
                    ) : (
                      <div className="live-text">{message.content}</div>
                    )}
                    {message.truncated && <p className="live-muted">内容过长，已截断显示。</p>}
                  </div>
                </article>
              ))}
              {state?.live && (
                <article className="assistant-message">
                  <span className="avatar crop-avatar">C</span>
                  <div className="message-body">
                    <h2>
                      CropCode <span>正在生成</span>
                    </h2>
                    <div className="live-text">{state.live.text}</div>
                  </div>
                </article>
              )}
              {!!state?.output && (
                <details className="tool-row">
                  <summary>进程输出</summary>
                  <pre className="live-text">{state.output}</pre>
                </details>
              )}
              {waiting && (
                <section className="live-permission" aria-label="权限确认">
                  <h2>需要你的确认</h2>
                  <p>以下操作由当前任务请求：</p>
                  {state.permissions.map((permission) => (
                    <div key={permission.toolCallId}>
                      <strong>{permission.name}</strong>
                      <pre className="live-text">{permission.command}</pre>
                      <p>{permission.scopes.join(" · ")}</p>
                    </div>
                  ))}
                  <div className="live-actions">
                    {(["deny", "allow"] as const).map((decision) => (
                      <button
                        key={decision}
                        disabled={unavailable || state.busy}
                        onClick={() =>
                          void action("/api/permission", {
                            decision,
                            toolCallIds: state.permissions.map((item) => item.toolCallId),
                          })
                        }
                      >
                        {decision === "allow" ? "允许本次操作" : "拒绝"}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {state?.question && (
                <section className="live-permission">
                  <h2>需要补充信息</h2>
                  {state.question.questions.map((question) => (
                    <div key={question.question}>
                      <p>{question.question}</p>
                      <p className="live-muted">可选：{question.options.map((option) => option.label).join(" / ")}</p>
                    </div>
                  ))}
                  <p>请在下方输入你的回答，可自由补充说明。</p>
                </section>
              )}
              {state?.proposedPlan && (
                <section className="live-permission">
                  <h2>方案已准备好</h2>
                  <button
                    disabled={unavailable || state.busy}
                    onClick={() =>
                      void action("/api/prompt", { text: "实现此方案，并验证实际结果。", planMode: false })
                    }
                  >
                    开始实施方案
                  </button>
                </section>
              )}
              <div ref={end} />
            </div>
          </section>
          <div className="live-composer">
            {choices.length > 0 && (
              <div className="live-choices" role="listbox" aria-label="输入建议">
                {choices.map((choice, index) => (
                  <button
                    key={choice}
                    role="option"
                    aria-selected={choiceIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectChoice(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={input}
              aria-label="任务输入"
              placeholder={waiting ? "请先处理权限确认" : "描述任务，@ 引用文件，/ 查看命令"}
              maxLength={32000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (choices.length && !dismissed) {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDismissed(true);
                    return;
                  }
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setChoiceIndex(
                      (choiceIndex + (event.key === "ArrowDown" ? 1 : choices.length - 1)) % choices.length
                    );
                    return;
                  }
                  if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
                    event.preventDefault();
                    selectChoice(choices[choiceIndex]);
                    return;
                  }
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <div className="live-composer-footer">
              <label>
                <input type="checkbox" checked={plan} onChange={(event) => setPlan(event.target.checked)} />
                计划模式
              </label>
              <span className="live-model" title={state?.model}>
                {state?.model || "未选择模型"}
              </span>
              {state?.busy ? (
                <button aria-label="停止生成" disabled={unavailable} onClick={() => void action("/api/interrupt", {})}>
                  <StopIcon />
                  停止
                </button>
              ) : (
                <button
                  aria-label="发送消息"
                  disabled={unavailable || !state.configured || waiting || !draft.trim()}
                  onClick={() => void send()}
                >
                  <ArrowUpIcon />
                  发送
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

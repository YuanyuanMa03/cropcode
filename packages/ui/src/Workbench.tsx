import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  Cross2Icon,
  DashboardIcon,
  FileTextIcon,
  GearIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  ResetIcon,
  RowsIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { Conversation } from "./Conversation";
import { IconButton, Modal, StateView } from "./components";
import { projects, scenes, tasks } from "./fixtures";
import type { PreviewState, Scene, TaskStatus, Theme } from "./fixtures";
import { Inspector } from "./Inspector";
import { Settings } from "./Settings";
import { Terminal } from "./Terminal";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("cropcode-preview-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Storage is optional in design preview. */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function Workbench() {
  const [scene, setScene] = useState<Scene>("task");
  const [previewState, setPreviewState] = useState<PreviewState>("ready");
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [project, setProject] = useState(0);
  const [activeTask, setActiveTask] = useState("methane");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [turns, setTurns] = useState<Record<string, string[]>>({});
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({});
  const [inspector, setInspector] = useState(() => window.innerWidth >= 1200);
  const [terminal, setTerminal] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [projectDialog, setProjectDialog] = useState(false);
  const key = `${project}:${activeTask}`;
  const title = tasks.find((task) => task.id === activeTask)?.title ?? "新建任务";
  const status = statuses[key] ?? "ready";
  const isConversation = scene === "task" || scene === "permission" || scene === "files";

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    try {
      localStorage.setItem("cropcode-preview-theme", theme);
    } catch {
      /* The current preview remains usable without storage. */
    }
  }, [theme]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch((open) => !open);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setActiveTask("new");
        setScene("task");
        setPreviewState("ready");
      }
      if (event.key === "Escape") {
        setSidebar(false);
        setInspector(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const go = (next: Scene) => {
    setScene(next);
    setSidebar(false);
    setPreviewState("ready");
    if (next === "permission") {
      setActiveTask("methane");
      setProject(0);
      setStatuses((current) => ({ ...current, "0:methane": "waiting" }));
    }
    if (next === "files") setInspector(true);
  };
  const openTask = (id: string, projectIndex: number) => {
    setProject(projectIndex);
    setActiveTask(id);
    go("task");
    setSearch(false);
  };
  const newTask = () => {
    setActiveTask("new");
    go("task");
  };
  const setStatus = (value: TaskStatus) => setStatuses((current) => ({ ...current, [key]: value }));
  const send = () => {
    const text = drafts[key]?.trim();
    if (!text) return;
    setTurns((current) => ({ ...current, [key]: [...(current[key] ?? []), text] }));
    setDrafts((current) => ({ ...current, [key]: "" }));
  };

  return (
    <div className="preview-root">
      <div className="preview-bar">
        <span>
          <span className="preview-dot" />
          设计预览<span className="preview-descriptor"> · 演示数据</span>
        </span>
        <div className="preview-controls">
          <label>
            <span className="sr-only">设计场景</span>
            <select aria-label="设计场景" value={scene} onChange={(event) => go(event.target.value as Scene)}>
              {scenes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label="页面状态"
            value={previewState}
            onChange={(event) => setPreviewState(event.target.value as PreviewState)}
          >
            <option value="ready">正常状态</option>
            <option value="loading">载入状态</option>
            <option value="empty">空状态</option>
            <option value="error">连接错误</option>
          </select>
          <IconButton
            label="重置演示"
            onClick={() => {
              setDrafts({});
              setTurns({});
              setStatuses({});
              setProject(0);
              setActiveTask("methane");
              setTerminal(false);
              setInspector(true);
              go("task");
            }}
          >
            <ResetIcon />
          </IconButton>
        </div>
      </div>
      <div className="app-shell">
        {sidebar && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setSidebar(false)} />}
        <aside
          className={`sidebar ${sidebar ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
          aria-label="项目与任务导航"
        >
          <div className="brand-row">
            <button className="brand" onClick={() => go("home")}>
              <span className="brand-mark">
                C<span />
              </span>
              CropCode
            </button>
            <span className="version-label">工作台</span>
            <button className="icon-button mobile-close" aria-label="收起导航" onClick={() => setSidebar(false)}>
              <Cross2Icon />
            </button>
          </div>
          <div className="nav-actions">
            <button className="nav-button" onClick={newTask}>
              <PlusIcon />
              新建任务<kbd>⌘ N</kbd>
            </button>
            <button className="nav-button" onClick={() => setSearch(true)}>
              <MagnifyingGlassIcon />
              搜索任务<kbd>⌘ K</kbd>
            </button>
          </div>
          <div className="nav-label">
            工作区
            <IconButton label="打开演示项目选择" onClick={() => setProjectDialog(true)}>
              <PlusIcon />
            </IconButton>
          </div>
          <nav className="project-nav">
            {projects.map((item, index) => (
              <div key={item.name} className="project-group">
                <button
                  className={`project-button ${index === project ? "current" : ""}`}
                  onClick={() => openTask(tasks.find((task) => task.project === index)!.id, index)}
                >
                  <ChevronRightIcon className={index === project ? "expanded" : ""} />
                  <span className="project-icon">{item.initial}</span>
                  {item.name}
                </button>
                {tasks
                  .filter((task) => task.project === index)
                  .map((task) => (
                    <button
                      key={task.id}
                      title={task.title}
                      className={`task-button ${activeTask === task.id && isConversation ? "active" : ""}`}
                      onClick={() => openTask(task.id, index)}
                    >
                      <span className={statuses[`${index}:${task.id}`] === "waiting" ? "waiting-dot" : "task-dot"} />
                      <span>{task.title}</span>
                    </button>
                  ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-note">
              <span className="local-indicator" />
              <span>本机工作区</span>
              <span className="tag">预览</span>
            </div>
            <button className={`nav-button ${scene === "settings" ? "active" : ""}`} onClick={() => go("settings")}>
              <GearIcon />
              设置
            </button>
            <div className="sidebar-footer">
              <span>CropCode 1.1</span>
              <IconButton
                label={theme === "light" ? "切换深色" : "切换浅色"}
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </IconButton>
            </div>
          </div>
        </aside>
        <main className="workspace">
          <header className="workspace-header">
            <IconButton
              label="切换项目导航"
              active={sidebar || sidebarCollapsed}
              onClick={() => {
                if (window.innerWidth < 768) setSidebar(!sidebar);
                else setSidebarCollapsed(!sidebarCollapsed);
              }}
            >
              <RowsIcon />
            </IconButton>
            <div className="breadcrumbs">
              <button onClick={() => go("home")}>{projects[project].name}</button>
              <span>/</span>
              <span title={isConversation ? title : scenes.find((item) => item.id === scene)?.label}>
                {isConversation ? title : scenes.find((item) => item.id === scene)?.label}
              </span>
            </div>
            <div className="workspace-tools">
              {isConversation && (
                <>
                  <span className={`status-badge ${status === "waiting" ? "status-waiting" : ""}`}>
                    <span />
                    {status === "waiting"
                      ? "等待确认"
                      : status === "done"
                        ? "已完成"
                        : status === "cancelled"
                          ? "已取消"
                          : "计划就绪"}
                  </span>
                  <IconButton label="切换终端面板" active={terminal} onClick={() => setTerminal(!terminal)}>
                    <CodeIcon />
                  </IconButton>
                  <IconButton label="切换文件面板" active={inspector} onClick={() => setInspector(!inspector)}>
                    <DashboardIcon />
                  </IconButton>
                </>
              )}
            </div>
          </header>
          <div className="workspace-content">
            {previewState !== "ready" ? (
              <StateView state={previewState} onReset={() => setPreviewState("ready")} />
            ) : scene === "home" ? (
              <div className="home-page">
                <div className="page-intro">
                  <span className="eyebrow">研究，从这里继续</span>
                  <h1>你的项目，你的下一步。</h1>
                  <p>把问题、代码与结果，放回同一个工作空间。</p>
                </div>
                <div className="section-heading">
                  <h2>最近项目</h2>
                  <button className="text-button" onClick={() => setProjectDialog(true)}>
                    <PlusIcon />
                    打开项目
                  </button>
                </div>
                <div className="recent-projects">
                  {projects.map((item, index) => (
                    <button
                      key={item.name}
                      onClick={() => openTask(tasks.find((task) => task.project === index)!.id, index)}
                    >
                      <span className="project-tile">{item.initial}</span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                        <code>{item.path}</code>
                      </span>
                      <ArrowRightIcon />
                    </button>
                  ))}
                </div>
                <div className="section-heading recent-heading">
                  <h2>继续任务</h2>
                  <span className="muted">最近的研究记录</span>
                </div>
                {tasks.map((task) => (
                  <button className="recent-task" key={task.id} onClick={() => openTask(task.id, task.project)}>
                    <FileTextIcon />
                    <span>
                      {task.title}
                      <small>{projects[task.project].name}</small>
                    </span>
                    <time>{task.time}</time>
                    <ChevronRightIcon />
                  </button>
                ))}
                <div className="home-note">
                  <CheckIcon />
                  所有项目与任务均为演示样例，可放心体验交互。
                </div>
              </div>
            ) : scene === "settings" ? (
              <Settings theme={theme} onTheme={setTheme} />
            ) : scene === "terminal" ? (
              <div className="terminal-page">
                <div className="page-intro">
                  <span className="eyebrow">专注输入，清晰输出</span>
                  <h1>终端工作台</h1>
                  <p>同一套任务语言，为键盘工作流设计。</p>
                </div>
                <Terminal />
              </div>
            ) : (
              <>
                <div className="conversation-column">
                  <Conversation
                    key={key}
                    draft={drafts[key] ?? ""}
                    onDraft={(text) => setDrafts((current) => ({ ...current, [key]: text }))}
                    status={status}
                    onStatus={setStatus}
                    messages={turns[key] ?? []}
                    onSend={send}
                    onFiles={() => setInspector(true)}
                    fresh={activeTask === "new"}
                    title={title}
                  />
                  {terminal && <Terminal compact />}
                </div>
                {inspector && <Inspector onClose={() => setInspector(false)} />}
              </>
            )}
          </div>
        </main>
      </div>
      <Modal open={search} onOpenChange={setSearch} title="搜索任务" description="搜索设计预览中的演示任务。">
        <input
          className="search-input"
          aria-label="搜索任务关键词"
          placeholder="输入任务或项目名称…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="search-results">
          {tasks
            .filter((task) =>
              `${task.title} ${projects[task.project].name}`.toLowerCase().includes(query.toLowerCase())
            )
            .map((task) => (
              <button key={task.id} onClick={() => openTask(task.id, task.project)}>
                <FileTextIcon />
                <span>
                  {task.title}
                  <small>{projects[task.project].name}</small>
                </span>
                <ArrowRightIcon />
              </button>
            ))}
          {!tasks.some((task) =>
            `${task.title} ${projects[task.project].name}`.toLowerCase().includes(query.toLowerCase())
          ) && <p className="muted">没有匹配任务，试试“水分”或“CropMath”。</p>}
        </div>
      </Modal>
      <Modal
        open={projectDialog}
        onOpenChange={setProjectDialog}
        title="打开项目"
        description="选择演示工作区。原生文件夹选择将在桌面接入阶段开放。"
      >
        <div className="search-results">
          {projects.map((item, index) => (
            <button
              key={item.name}
              onClick={() => {
                openTask(tasks.find((task) => task.project === index)!.id, index);
                setProjectDialog(false);
              }}
            >
              <span className="project-icon">{item.initial}</span>
              <span>
                {item.name}
                <small>{item.path}</small>
              </span>
              <ArrowRightIcon />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  FileTextIcon,
  PlusIcon,
  StopIcon,
} from "@radix-ui/react-icons";
import type { TaskStatus } from "./fixtures";

type Props = {
  draft: string;
  onDraft: (text: string) => void;
  status: TaskStatus;
  onStatus: (status: TaskStatus) => void;
  messages: string[];
  onSend: () => void;
  onFiles: () => void;
  fresh: boolean;
  title: string;
};

export function Conversation({ draft, onDraft, status, onStatus, messages, onSend, onFiles, fresh, title }: Props) {
  const [menu, setMenu] = useState<"files" | "commands" | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const latest = useRef<HTMLDivElement>(null);
  const permission = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length > 0) latest.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  useEffect(() => {
    if (status === "waiting") permission.current?.scrollIntoView({ block: "nearest" });
  }, [status]);
  const choices = menu === "files" ? ["@src/model/methane.py", "@data/weather_2025.csv"] : ["/plan", "/help"];
  const select = (item: string) => {
    onDraft(`${draft.replace(/[@/][^\s]*$/, "")}${item} `);
    setMenu(null);
  };
  return (
    <>
      <section className="conversation" aria-label="任务对话">
        <div className="conversation-inner">
          {fresh && messages.length === 0 ? (
            <div className="new-task">
              <span className="eyebrow">从一个具体的问题开始</span>
              <h1>今天想推进哪项研究？</h1>
              <p>梳理思路、检查代码，或让数据讲清楚一个结果。</p>
              <button className="suggestion" onClick={() => onDraft("请检查甲烷模块的水分响应，并补充边界测试。")}>
                检查模型中的边界条件 <ChevronRightIcon />
              </button>
              <button className="suggestion" onClick={() => onDraft("请分析不同处理的产量差异，先给出分析计划。")}>
                制定试验数据分析计划 <ChevronRightIcon />
              </button>
            </div>
          ) : (
            <>
              <div className="turn-date">
                今天 <span>14:32</span>
              </div>
              <article className="user-message">
                <span className="avatar user-avatar">你</span>
                <div>
                  <h2>你</h2>
                  <p>
                    {title === "检查甲烷模块的水分响应"
                      ? "检查甲烷模块的水分响应，确认干旱和饱和条件下的边界行为，并补充测试。先告诉我准备怎么改。"
                      : title}
                  </p>
                  <button className="file-chip" onClick={onFiles}>
                    <FileTextIcon /> src/model/methane.py
                  </button>
                </div>
              </article>
              <article className="assistant-message">
                <span className="avatar crop-avatar">C</span>
                <div className="message-body">
                  <h2>
                    CropCode <span>执行计划</span>
                  </h2>
                  <p>我会先核对水分因子的输入范围，再检查它对排放计算的影响。修改将集中在边界处理和相应测试。</p>
                  <ol className="plan-list">
                    <li>
                      <CheckIcon />
                      <span>读取水分响应函数与现有测试</span>
                    </li>
                    <li>
                      <CheckIcon />
                      <span>检查干旱、饱和及超出范围的输入</span>
                    </li>
                    <li>
                      <span className="step-dot" />
                      <span>补充边界处理，运行针对性测试</span>
                    </li>
                  </ol>
                  <details className="tool-row">
                    <summary>
                      <CodeIcon />
                      <span>已读取 2 个文件</span>
                      <span className="muted">演示记录</span>
                      <ChevronRightIcon />
                    </summary>
                    <pre>src/model/methane.py{"\n"}tests/test_methane.py</pre>
                  </details>
                  <p>
                    当前函数直接对输入取平方。演示修改会将输入限制在 <code>[0, 1]</code>，并用干旱与饱和条件验证边界。
                  </p>
                  <button className="change-link" onClick={onFiles}>
                    <FileTextIcon />
                    <span>查看建议变更</span>
                    <span className="diff-count">+2 −1</span>
                    <ChevronRightIcon />
                  </button>
                  {status === "waiting" && (
                    <div ref={permission} className="permission" role="region" aria-label="等待授权">
                      <div className="section-heading">
                        <strong>
                          <span className="waiting-dot" />
                          需要你确认
                        </strong>
                        <span className="tag">仅本次</span>
                      </div>
                      <p>允许在当前演示项目运行这条测试命令？</p>
                      <pre>python -m pytest tests/test_methane.py -q</pre>
                      <p className="permission-note">
                        工作目录：~/Research/RiceGrow
                        <br />
                        此预览只演示授权交互，不执行命令。
                      </p>
                      <div className="button-row">
                        <button className="primary" onClick={() => onStatus("done")}>
                          允许本次
                        </button>
                        <button className="secondary" onClick={() => onStatus("cancelled")}>
                          拒绝
                        </button>
                      </div>
                    </div>
                  )}
                  {status === "done" && (
                    <div className="result-note" role="status">
                      <CheckIcon />
                      已允许本次操作。演示流程完成，未运行真实测试。
                    </div>
                  )}
                  {status === "cancelled" && (
                    <div className="result-note" role="status">
                      <StopIcon />
                      本次演示已取消，没有执行命令。
                    </div>
                  )}
                  {status === "ready" && (
                    <button className="secondary" onClick={() => onStatus("waiting")}>
                      预览执行前授权
                    </button>
                  )}
                </div>
              </article>
            </>
          )}
          {messages.map((message, index) => (
            <div className="demo-turn" key={index}>
              <article className="user-message">
                <span className="avatar user-avatar">你</span>
                <div>
                  <h2>你</h2>
                  <p>{message}</p>
                </div>
              </article>
              <article className="assistant-message">
                <span className="avatar crop-avatar">C</span>
                <div>
                  <h2>
                    CropCode <span>演示回复</span>
                  </h2>
                  <p>已收到这条输入。这里用于检查消息排版和交互，真实模型将在内核接入阶段连接。</p>
                </div>
              </article>
            </div>
          ))}
          <div ref={latest} />
        </div>
      </section>
      <div className="composer-wrap">
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) {
              onSend();
              setMenu(null);
            }
          }}
        >
          {menu && (
            <div className="composer-menu" aria-label={menu === "files" ? "演示文件" : "演示命令"}>
              {choices.map((choice, index) => (
                <button
                  className={menuIndex === index ? "selected" : ""}
                  type="button"
                  key={choice}
                  onClick={() => select(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
          <textarea
            aria-label="输入任务"
            placeholder="描述任务，@ 引用文件，/ 查看命令"
            value={draft}
            onChange={(event) => {
              setMenuIndex(0);
              onDraft(event.target.value);
              setMenu(
                event.target.value.endsWith("@") ? "files" : event.target.value.endsWith("/") ? "commands" : null
              );
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Escape" && menu) {
                event.stopPropagation();
                setMenu(null);
              }
              if (menu && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                setMenuIndex(
                  (index) => (index + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length
                );
              }
              if (menu && (event.key === "Enter" || event.key === "Tab")) {
                event.preventDefault();
                select(choices[menuIndex]);
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !menu) {
                event.preventDefault();
                if (draft.trim()) {
                  onSend();
                  setMenu(null);
                }
              }
            }}
          />
          <div className="composer-footer">
            <button
              className="icon-button"
              type="button"
              title="引用演示文件"
              aria-label="引用演示文件"
              onClick={() => setMenu(menu === "files" ? null : "files")}
            >
              <PlusIcon />
            </button>
            <select aria-label="演示模型" defaultValue="自定义模型">
              <option>自定义模型</option>
              <option>科研分析模型</option>
            </select>
            <select aria-label="工作模式" defaultValue="计划">
              <option>计划</option>
              <option>执行</option>
            </select>
            <span className="composer-spacer" />
            <button className="send" aria-label="发送演示消息" disabled={!draft.trim()}>
              <ArrowUpIcon />
            </button>
          </div>
        </form>
        <div className="composer-hint">
          演示工作区 · 不会读取本地文件或调用模型<span>Shift + Enter 换行</span>
        </div>
      </div>
    </>
  );
}

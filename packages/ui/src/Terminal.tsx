import { useState } from "react";

export function Terminal({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  return (
    <section className={`terminal ${compact ? "terminal-compact" : "terminal-full"}`} aria-label="终端设计预览">
      <header>
        <span className="terminal-brand">cropcode</span>
        <span>RiceGrow</span>
        <span className="terminal-mode">计划 · 演示</span>
      </header>
      <div className="terminal-output">
        <p className="terminal-muted">~/Research/RiceGrow</p>
        <p>检查甲烷模块的水分响应</p>
        <p className="terminal-green">
          ✓ 读取 src/model/methane.py
          <br />✓ 读取 tests/test_methane.py
        </p>
        {!compact && (
          <>
            <p>准备检查三个边界条件：</p>
            <p className="terminal-muted">
              {" "}
              01 干旱土壤，水分比例为 0<br /> 02 饱和土壤，水分比例为 1<br /> 03 超出范围的输入
            </p>
            <div className="terminal-permission">
              <span>等待确认 · 示例</span>
              <p>python -m pytest tests/test_methane.py -q</p>
              <span className="terminal-muted">允许本次 / 拒绝 · 在任务授权场景体验</span>
            </div>
          </>
        )}
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (input.trim()) {
            setLines([...lines, `› ${input}`, "演示输入已接收，未执行 Shell 或模型请求。"]);
            setInput("");
          }
        }}
      >
        <span>›</span>
        <input
          aria-label="终端演示输入"
          placeholder="输入内容，体验终端排版…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" disabled={!input.trim()}>
          发送
        </button>
      </form>
      <footer>
        终端外观预览 · 非真实 Shell<span>/ 命令 · @ 文件</span>
      </footer>
    </section>
  );
}

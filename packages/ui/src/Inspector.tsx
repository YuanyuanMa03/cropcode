import { useState } from "react";
import { CheckIcon, Cross2Icon, FileTextIcon } from "@radix-ui/react-icons";
import { diff, files } from "./fixtures";
import { IconButton } from "./components";

export function Inspector({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("变更");
  const [file, setFile] = useState(0);
  const [query, setQuery] = useState("");
  return (
    <aside className="inspector" aria-label="文件检查面板">
      <header>
        <div className="panel-tabs" role="tablist" aria-label="检查内容">
          {["文件", "变更", "产物"].map((item) => (
            <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
              {item}
              {item === "变更" && <span className="count">1</span>}
            </button>
          ))}
        </div>
        <IconButton label="关闭文件面板" onClick={onClose}>
          <Cross2Icon />
        </IconButton>
      </header>
      {tab === "文件" ? (
        <>
          <div className="file-search">
            <input
              aria-label="搜索演示文件"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="查找文件…"
            />
          </div>
          <div className="file-list">
            {files
              .filter((item) => item.path.includes(query))
              .map((item) => (
                <button
                  key={item.path}
                  className={files[file].path === item.path ? "selected" : ""}
                  onClick={() => setFile(files.indexOf(item))}
                >
                  <FileTextIcon />
                  <span>{item.path}</span>
                </button>
              ))}
            {files.filter((item) => item.path.includes(query)).length === 0 && (
              <p className="muted">没有匹配的演示文件。</p>
            )}
          </div>
          <div className="file-heading">
            <span>{files[file].path.split("/").at(-1)}</span>
            <span>{files[file].kind}</span>
          </div>
          <pre className="file-preview">{files[file].content}</pre>
        </>
      ) : tab === "变更" ? (
        <>
          <div className="change-summary">
            <strong>建议修改</strong>
            <span className="diff-count">+2 −1</span>
            <p>为水分因子增加上下界</p>
          </div>
          <div className="file-heading">
            <FileTextIcon />
            <span>src/model/methane.py</span>
            <span className="tag">M</span>
          </div>
          <div className="diff-view" aria-label="代码差异">
            <div className="diff-location">@@ moisture_factor @@</div>
            {diff.map((line, i) => (
              <div key={i} className={`diff-line ${line.type}`}>
                <span className="line-number">{i + 1}</span>
                <span className="diff-sign">{line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}</span>
                <code>{line.text}</code>
              </div>
            ))}
          </div>
          <div className="inspector-note">
            <CheckIcon />
            <p>这是建议变更的设计预览。项目文件尚未修改。</p>
          </div>
        </>
      ) : (
        <div className="artifact">
          <span className="eyebrow">研究产物 · 示例</span>
          <h3>不同水分条件的响应</h3>
          <p className="muted">用于预览图表在工作台内的呈现。</p>
          <div className="chart" aria-label="演示响应值：干旱 0，半饱和 0.25，饱和 1">
            {[
              { label: "干旱", value: 0 },
              { label: "半饱和", value: 0.25 },
              { label: "饱和", value: 1 },
            ].map((item) => (
              <div className="chart-column" key={item.label}>
                <span>{item.value.toFixed(2)}</span>
                <div style={{ height: `${4 + item.value * 116}px` }} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
          <p className="artifact-caption">moisture_response.svg · 演示图表</p>
        </div>
      )}
      <footer>演示文件 · 只读预览</footer>
    </aside>
  );
}

import { useState } from "react";
import { CheckIcon, DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import type { Theme } from "./fixtures";

export function Settings({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  const [section, setSection] = useState("外观");
  const [saved, setSaved] = useState(false);
  return (
    <div className="settings-page">
      <div className="page-intro">
        <span className="eyebrow">你的工作方式</span>
        <h1>设置</h1>
        <p>让工作台适合你的研究节奏。</p>
      </div>
      <div className="settings-layout">
        <nav aria-label="设置分类">
          {["外观", "模型供应商", "权限", "MCP 与 Skills"].map((item) => (
            <button
              key={item}
              className={item === section ? "selected" : ""}
              onClick={() => {
                setSection(item);
                setSaved(false);
              }}
            >
              {item}
            </button>
          ))}
        </nav>
        <section className="settings-content">
          <h2>{section}</h2>
          {section === "外观" ? (
            <>
              <p className="muted">主题即时生效，仅保存到当前浏览器的预览偏好。</p>
              <div className="theme-options">
                {(["light", "dark"] as const).map((value) => (
                  <button key={value} aria-pressed={theme === value} onClick={() => onTheme(value)}>
                    <span className={`theme-sample sample-${value}`}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      {value === "light" ? <SunIcon /> : <MoonIcon />}
                      {value === "light" ? "浅色" : "深色"}
                      {theme === value && <CheckIcon />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="setting-row">
                <div>
                  <strong>界面字号</strong>
                  <p>原型基线，代码与终端单独设计</p>
                </div>
                <span className="tag">14 px</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>减少动态效果</strong>
                  <p>自动遵循系统的辅助功能偏好</p>
                </div>
                <DesktopIcon />
              </div>
            </>
          ) : section === "模型供应商" ? (
            <>
              <p className="muted">模型配置布局预览。本页不会保存密钥或连接供应商。</p>
              <label className="field">
                配置范围
                <select>
                  <option>用户配置</option>
                  <option>当前项目</option>
                </select>
              </label>
              <label className="field">
                供应商
                <select>
                  <option>OpenAI 兼容接口</option>
                  <option>DeepSeek</option>
                  <option>自定义供应商</option>
                </select>
              </label>
              <label className="field">
                模型名称
                <input placeholder="输入模型标识（仅演示）" onChange={() => setSaved(false)} />
              </label>
              <button className="secondary" onClick={() => setSaved(true)}>
                预览保存反馈
              </button>
              {saved && (
                <p className="result-note" role="status">
                  <CheckIcon />
                  演示反馈：未保存真实配置。
                </p>
              )}
            </>
          ) : section === "权限" ? (
            <>
              <p className="muted">演示任务使用逐次确认。真实权限仍由 CropCode 内核管理。</p>
              <div className="setting-row">
                <div>
                  <strong>Shell 命令</strong>
                  <p>展示命令与工作目录，执行前确认</p>
                </div>
                <span className="tag">询问</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>修改文件</strong>
                  <p>先查看路径与变更，再处理授权</p>
                </div>
                <span className="tag">询问</span>
              </div>
            </>
          ) : (
            <>
              <p className="muted">扩展能力入口设计。真实安装与启用将在服务接入后开放。</p>
              <div className="setting-row">
                <div>
                  <strong>农业科研 Skills</strong>
                  <p>模型检查、数据分析与科研写作</p>
                </div>
                <span className="tag">示例</span>
              </div>
              <div className="setting-row">
                <div>
                  <strong>MCP 服务</strong>
                  <p>尚未连接真实工作区</p>
                </div>
                <span className="tag">未连接</span>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

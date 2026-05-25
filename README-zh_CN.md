<div align="center">
<br/>
<p align="center">
  <h1>🌾 CropCode</h1>
  <p><strong>AI Coding Agent for Agricultural Research</strong></p>
</p>

[English](README-en.md) · 中文

<br/>
</div>

**CropCode** 是专为农业科研领域设计的终端 AI 编码助手，支持数据分析、作物模型调用、实验设计和科学计算。

## 安装

```bash
git clone https://github.com/mayuanyuan/cropcode.git
cd cropcode
npm install
npm link
```

在任意项目目录下运行 `cropcode` 即可启动。

## 配置

创建 `~/.cropcode/settings.json` 文件：

```json
{
  "env": {
    "MODEL": "deepseek-v4-pro",
    "BASE_URL": "https://api.deepseek.com",
    "API_KEY": "sk-..."
  },
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

## 核心能力

### 🌱 农业数据分析
- 产量数据、气象数据、土壤数据的清洗、统计和可视化
- Python (pandas/numpy/scipy/matplotlib) + R

### 🌿 作物模型
- `/crop-model` 命令调用 RiceGrow、CH4MOD、DSSAT、APSIM
- 参数校准与模拟结果分析

### 🧪 实验工具
- 实验设计（随机区组、裂区、正交设计）
- 方差分析、多重比较、回归建模

### 📄 论文工具
- LaTeX 排版、参考文献管理
- 图表生成、数据可视化

### 🤖 Agent 能力
- 深度思考 + 推理强度控制
- Agent Skills 系统
- MCP 集成
- 多会话管理

## 快捷键

| 操作 | 按键 |
|------|------|
| 发送 | Enter |
| 换行 | Shift+Enter |
| 中断生成 | Esc |
| 命令菜单 | / |
| 切换模型 | /model |
| 作物模型 | /crop-model |
| 查看技能 | /skills |
| 新会话 | /new |
| 恢复会话 | /resume |
| 撤销 | /undo |
| 退出 | /exit 或 Ctrl+D×2 |

## 致谢

本项目在开发过程中参考了以下开源技术/项目：
- [DeepSeek](https://deepseek.com) — LLM 模型服务
- [Ink](https://github.com/vadimdemedes/ink) — 终端 React 渲染引擎
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) — LLM API 调用
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) — AI 工具集成协议
- [esbuild](https://esbuild.github.io/) — JavaScript 构建工具
- [React](https://react.dev/) — UI 框架
- [Zod](https://zod.dev/) — 数据校验
- [Deep Code CLI](https://github.com/lessweb/deepcode-cli) — CLI 交互范式参考

## 许可证

MIT

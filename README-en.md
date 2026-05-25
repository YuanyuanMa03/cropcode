<div align="center">
<br/>
<p align="center">
  <h1>🌾 CropCode</h1>
  <p><strong>AI Coding Agent for Agricultural Research</strong></p>
</p>

[English](README-en.md) · 中文

<br/>
</div>

**CropCode** is an AI-powered terminal coding agent designed for agricultural research, supporting data analysis, crop model simulation, experiment design, and scientific computing.

## Install

```bash
git clone https://github.com/mayuanyuan/cropcode.git
cd cropcode
npm install
npm link
```

Run `cropcode` in any project directory.

## Configuration

Create `~/.cropcode/settings.json`:

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

## Core Features

### 🌱 Agricultural Data Analysis
- Yield, weather, and soil data cleaning, statistics, and visualization
- Python (pandas/numpy/scipy/matplotlib) + R

### 🌿 Crop Models
- `/crop-model` command for RiceGrow, CH4MOD, DSSAT, APSIM
- Parameter calibration and simulation analysis

### 🧪 Experiment Tools
- Experimental design (RCBD, split-plot, orthogonal)
- ANOVA, mean separation, regression modeling

### 📄 Paper Tools
- LaTeX typesetting, reference management
- Figure generation, data visualization

### 🤖 Agent Capabilities
- Deep thinking + reasoning effort control
- Agent Skills system
- MCP integration
- Multi-session management

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Send | Enter |
| Newline | Shift+Enter |
| Interrupt | Esc |
| Command menu | / |
| Switch model | /model |
| Crop model | /crop-model |
| List skills | /skills |
| New session | /new |
| Resume session | /resume |
| Undo | /undo |
| Exit | /exit or Ctrl+D×2 |

## Acknowledgments

This project was developed with reference to the following open-source technologies:
- [DeepSeek](https://deepseek.com) — LLM model provider
- [Ink](https://github.com/vadimdemedes/ink) — Terminal React renderer
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) — LLM API integration
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) — AI tool integration standard
- [esbuild](https://esbuild.github.io/) — JavaScript bundler
- [React](https://react.dev/) — UI framework
- [Zod](https://zod.dev/) — Data validation
- [Deep Code CLI](https://github.com/lessweb/deepcode-cli) — CLI interaction pattern reference

## License

MIT

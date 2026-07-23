# models-research/

作物模拟研究代码暂存区。这些文件原位于 `src/models/`，是面向农业科研的作物生长模拟实现（DSSAT/WOFOST/SIMPLE 算法、土壤/气象 API 适配器、品种库）。

## 为什么在这里

经全仓审计，这些代码**未被 CLI 任何入口引用**（`cli.tsx` / `session.ts` / `tools/` / `mcp/` / `templates/` 中零 import），属于未接入 agent 运行时的研究代码。为对齐 deepcode 的工程化包结构（`packages/core` + `packages/cli`），将其移出主构建树，避免污染 CLI 构建产物。

## 后续计划

下一阶段「耦合水稻生长与甲烷排放的稻作系统模拟智能体」研究时，将把这些模型接成 MCP server 或专用 tool，让 agent 真正能调用。届时会从此目录迁入正式包结构。

## 内容概览

| 文件 | 说明 |
|---|---|
| `crop-adapter.ts` | 中文地名/作物 → 模型参数适配，含品种库 |
| `simple-adapter.ts` | 参数 → SIMPLE 模型输入文件（DSSAT 定宽格式） |
| `soil-api.ts` | ISRIC SoilGrids 土壤数据获取 |
| `weather-api.ts` / `weather_api.py` | NASA POWER 气象数据获取 |
| `cropsim.py` / `cropsim_v2.py` | CropSim 模型（SIMPLE / WOFOST 算法） |
| `test_*.py` / `test-*.ts` | 测试文件 |

> 注：本目录不在 tsconfig include 范围内，不参与 typecheck / build。

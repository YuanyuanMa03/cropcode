# 模型供应商

CropCode 2.2.0 在统一的会话与工具执行流程上接入以下供应商。登录使用 `/login`，模型选择使用 `/model`。

| 供应商 | API Base URL | 套餐 Base URL |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | — |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `https://open.bigmodel.cn/api/coding/paas/v4` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `https://coding.dashscope.aliyuncs.com/v1` |
| MiMo 小米 | `https://api.xiaomimimo.com/v1` | `https://token-plan-cn.xiaomimimo.com/v1` |
| LongCat | `https://api.longcat.chat/openai/v1` | — |

模型菜单尝试从实际配置的 `/models` 接口发现模型。失败时回退到预设和当前模型。预设并不保证账号拥有访问权限，不维护静态价格或赠送额度。

## 配置与切换

配置优先级：`CROPCODE_*` 环境变量 > `.cropcode/settings.json` 项目配置 > `~/.cropcode/settings.json` 用户配置 > `~/.cropcode/credentials.json` 登录凭证 > 内置默认。

登录向导保存供应商凭证，并同时更新用户配置中的 API Key、Base URL、模型和思考开关。更高优先级的项目配置或环境变量仍然生效。如果登录后显示的模型不变，先检查这些覆盖项。密钥不显示在界面里；配置和凭证文件在 Unix 上以仅当前用户可读写的权限保存。

`/model` 修改当前项目（存在项目配置时）或用户配置，不改变供应商的 API Key 和地址。也可直接配置任意兼容的 Base URL 和模型 ID；第三方服务是否支持思考参数取决于其协议。

`contextWindow`、`autoCompactWindow` 和 `multimodal` 保留原有显式配置机制。新发现模型的上下文长度不会从模型名猜测，请按供应商文档配置。

## 思考协议

- DeepSeek：`thinking.type` 控制开关，`reasoning_effort` 使用 `low/high/max`。
- GLM：`thinking.type` 控制开关；GLM-5.2 发送 `high/max`，不向旧模型发送未声明支持的强度参数。
- Qwen：`enable_thinking` 控制开关，界面强度映射为 `thinking_budget`（4096 / 16384 / 32768）。这些是客户端预算选择，不代表供应商承诺的效果等级。
- MiMo、LongCat：发送 `thinking.type`，界面提供开/关，不假定支持通用的 `reasoning_effort`。

关闭思考会发送明确的关闭值；JavaScript SDK 请求中的参数直接放在请求体顶层。会话中工具调用相关的 `reasoning_content` 继续由统一消息转换器回放。

## 官方资料

以下协议资料于 2026-09-20 核查；实际模型和套餐能力以供应商最新文档为准。

- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)
- [智谱深度思考](https://docs.bigmodel.cn/cn/guide/capabilities/thinking)
- [Qwen 深度思考](https://help.aliyun.com/zh/model-studio/deep-thinking)
- [Qwen Coding Plan 接入](https://help.aliyun.com/zh/model-studio/qwen-code)
- [MiMo 思考与历史回放](https://platform.xiaomimimo.com/docs/en-US/usage-guide/passing-back-reasoning_content)
- [MiMo Token Plan](https://mimo.mi.com/docs/zh-CN/tokenplan/integration/tools-overview)
- [LongCat Chat Completions](https://longcat.chat/platform/docs/api/chat)

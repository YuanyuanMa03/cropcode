import type { CommandCenterApp, CommandCenterDeps } from "./types.js";

/** 会话切换已经成功；偏好写入失败只追加提示，不能把成功的切换报告成失败。 */
export async function rememberCurrentModelSelection(
  app: CommandCenterApp,
  deps: CommandCenterDeps,
): Promise<string> {
  if (!deps.saveDefaultModelSelection) return "";
  try {
    const ref = app.getCurrentModelOption?.()?.ref;
    const reasoningLevel = app.getThoughtLevel?.();
    if (!ref) throw new Error("当前模型选择不完整。");
    await deps.saveDefaultModelSelection({
      providerId: ref.providerId,
      modelId: ref.modelId,
      ...(reasoningLevel ? { options: { reasoningLevel } } : {}),
    });
    return "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `\n当前模型已生效，但无法保存为新任务的默认模型：${message}`;
  }
}

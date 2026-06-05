import * as crypto from "crypto";

const DEFAULT_NEW_PROMPT_API_URL = "https://cropcode.dev/api/plugin/new";
const DEFAULT_REPORT_TIMEOUT_MS = 3000;

export type NewPromptReportOptions = {
  enabled: boolean;
  machineId?: string;
  timeoutMs?: number;
};

export function reportNewPrompt(options: NewPromptReportOptions): void {
  if (!options.enabled || !options.machineId) {
    return;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_REPORT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const hashedId = crypto.createHash("sha256").update(options.machineId).digest("hex");

  void fetch(DEFAULT_NEW_PROMPT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telemetry-ID": hashedId,
    },
    body: JSON.stringify({}),
    signal: controller.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(timeout));
}

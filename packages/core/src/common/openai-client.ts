import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { resolveCurrentSettings } from "../settings";
import { getActiveApiKey, getActiveBaseURL, getActiveModel } from "./providers";

const keepAliveAgent = new Agent({ keepAliveTimeout: 180_000 });

let cachedOpenAI: OpenAI | null = null;
let cachedOpenAIKey = "";

export function createOpenAIClient(projectRoot: string = process.cwd()): {
  client: OpenAI | null;
  model: string;
  baseURL: string;
  temperature?: number;
  thinkingEnabled: boolean;
  reasoningEffort: string;
  debugLogEnabled: boolean;
  notify?: string;
  webSearchTool?: string;
  env: Record<string, string>;
  machineId?: string;
} {
  const settings = resolveCurrentSettings(projectRoot);

  // Prefer credentials.json (multi-provider login) over legacy settings
  const credentialApiKey = getActiveApiKey();
  const credentialBaseURL = getActiveBaseURL();
  const credentialModel = getActiveModel();

  const apiKey = credentialApiKey || settings.apiKey;
  const baseURL = credentialBaseURL || settings.baseURL;
  const model = credentialModel || settings.model;

  if (!apiKey) {
    return {
      client: null,
      model,
      baseURL,
      temperature: settings.temperature,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      debugLogEnabled: settings.debugLogEnabled,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      env: settings.env,
      machineId: getMachineId(),
    };
  }

  const cacheKey = `${apiKey}::${baseURL}`;
  if (cachedOpenAI && cachedOpenAIKey === cacheKey) {
    return {
      client: cachedOpenAI,
      model,
      baseURL,
      temperature: settings.temperature,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      debugLogEnabled: settings.debugLogEnabled,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      env: settings.env,
      machineId: getMachineId(),
    };
  }

  cachedOpenAI = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (url: any, init: any) => undiciFetch(url, { ...init, dispatcher: keepAliveAgent }),
  });
  cachedOpenAIKey = cacheKey;

  const warmupClient = cachedOpenAI;
  void (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      await warmupClient.models.list({ signal: ac.signal }).catch(() => {});
    } finally {
      clearTimeout(timer);
    }
  })();

  return {
    client: cachedOpenAI,
    model,
    baseURL,
    temperature: settings.temperature,
    thinkingEnabled: settings.thinkingEnabled,
    reasoningEffort: settings.reasoningEffort,
    debugLogEnabled: settings.debugLogEnabled,
    notify: settings.notify,
    webSearchTool: settings.webSearchTool,
    env: settings.env,
    machineId: getMachineId(),
  };
}

function getMachineId(): string | undefined {
  try {
    const idPath = path.join(os.homedir(), ".cropcode", "machine-id");
    if (fs.existsSync(idPath)) {
      const raw = fs.readFileSync(idPath, "utf8").trim();
      if (raw) {
        return raw;
      }
    }
    const generated = `${os.hostname()}-${crypto.randomUUID()}`;
    fs.mkdirSync(path.dirname(idPath), { recursive: true });
    fs.writeFileSync(idPath, generated, "utf8");
    return generated;
  } catch {
    return undefined;
  }
}

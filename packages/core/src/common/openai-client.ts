import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { resolveCurrentSettings, type ReasoningEffort } from "../settings";

// Custom undici Agent with a 180-second keepAlive timeout.  The default
// global fetch (undici) only keeps connections alive for 4 seconds, which
// is too short for a CLI where the user may spend 10–30 seconds reading
// output between prompts.  By passing a dedicated Agent to undiciFetch we
// keep connections reusable for three minutes after the last request.
const keepAliveAgent = new Agent({ keepAliveTimeout: 180_000 });

// Module-level cache for the OpenAI client instance.  The client itself is
// a stateless fetch wrapper, so it is safe to share across calls as long as
// the apiKey + baseURL stay the same.  Model, thinking-mode and other
// settings are always read fresh from the project / user config files.
let cachedOpenAI: OpenAI | null = null;
let cachedOpenAIKey = "";

export function resolveOpenAIConnection(settings: { apiKey?: string; baseURL: string }): {
  apiKey?: string;
  baseURL: string;
} {
  return { apiKey: settings.apiKey, baseURL: settings.baseURL };
}

export function createOpenAIClient(projectRoot: string = process.cwd()): {
  client: OpenAI | null;
  apiKey?: string;
  model: string;
  baseURL: string;
  temperature?: number;
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort;
  debugLogEnabled: boolean;
  notify?: string;
  webSearchTool?: string;
  env: Record<string, string>;
} {
  const settings = resolveCurrentSettings(projectRoot);
  const connection = resolveOpenAIConnection(settings);
  if (!connection.apiKey) {
    return {
      client: null,
      apiKey: undefined,
      model: settings.model,
      baseURL: connection.baseURL,
      temperature: settings.temperature,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      debugLogEnabled: settings.debugLogEnabled,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      env: settings.env,
    };
  }

  const cacheKey = `${connection.apiKey}::${connection.baseURL}`;
  if (cachedOpenAI && cachedOpenAIKey === cacheKey) {
    return {
      client: cachedOpenAI,
      apiKey: connection.apiKey,
      model: settings.model,
      baseURL: connection.baseURL,
      temperature: settings.temperature,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      debugLogEnabled: settings.debugLogEnabled,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      env: settings.env,
    };
  }

  cachedOpenAI = new OpenAI({
    apiKey: connection.apiKey,
    baseURL: connection.baseURL || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (url: any, init: any) => undiciFetch(url, { ...init, dispatcher: keepAliveAgent }),
  });
  cachedOpenAIKey = cacheKey;

  // Fire-and-forget warmup: pre-establish TCP+TLS connection to the API
  // server while the user is composing their first prompt.  Bounded by a
  // short timeout so a slow / unreachable API never blocks process exit.
  void (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      await cachedOpenAI.models.list({ signal: ac.signal }).catch(() => {});
    } finally {
      clearTimeout(timer);
    }
  })();

  return {
    client: cachedOpenAI,
    apiKey: connection.apiKey,
    model: settings.model,
    baseURL: connection.baseURL,
    temperature: settings.temperature,
    thinkingEnabled: settings.thinkingEnabled,
    reasoningEffort: settings.reasoningEffort,
    debugLogEnabled: settings.debugLogEnabled,
    notify: settings.notify,
    webSearchTool: settings.webSearchTool,
    env: settings.env,
  };
}

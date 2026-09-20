import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { findProviderById, resolveProviderBaseURL } from "./provider-presets";

export type ProviderCredential = {
  providerId: string;
  apiKey: string;
  activeModel: string;
  mode: "api" | "coding-plan";
  thinkingEnabled?: boolean;
  reasoningEffort?: string;
};

export type CredentialsFile = {
  activeProvider: string;
  providers: Record<string, ProviderCredential>;
};

const CREDENTIALS_DIR = ".cropcode";
const CREDENTIALS_FILE = "credentials.json";

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

export function readCredentials(): CredentialsFile | null {
  const filePath = getCredentialsPath();
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CredentialsFile;
    if (
      !parsed ||
      typeof parsed.activeProvider !== "string" ||
      !parsed.providers ||
      typeof parsed.providers !== "object"
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCredentials(credentials: CredentialsFile): void {
  const filePath = getCredentialsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2), { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") fs.chmodSync(filePath, 0o600);
}

export function getActiveCredential(): ProviderCredential | null {
  const creds = readCredentials();
  if (!creds) return null;
  const credential = creds.providers[creds.activeProvider];
  return credential &&
    findProviderById(credential.providerId) &&
    typeof credential.apiKey === "string" &&
    credential.apiKey.trim() &&
    typeof credential.activeModel === "string" &&
    credential.activeModel.trim() &&
    (credential.mode === "api" || credential.mode === "coding-plan")
    ? credential
    : null;
}

export function setActiveCredential(
  providerId: string,
  apiKey: string,
  activeModel: string,
  mode: "api" | "coding-plan" = "api",
  thinkingEnabled?: boolean,
  reasoningEffort?: string
): void {
  const creds = readCredentials() ?? { activeProvider: providerId, providers: {} };
  creds.activeProvider = providerId;
  creds.providers[providerId] = { providerId, apiKey, activeModel, mode, thinkingEnabled, reasoningEffort };
  writeCredentials(creds);
}

export function getActiveBaseURL(): string {
  const cred = getActiveCredential();
  if (!cred) return "";
  return resolveProviderBaseURL(cred.providerId, cred.mode);
}

export function getActiveApiKey(): string {
  return getActiveCredential()?.apiKey ?? "";
}

export function getActiveModel(): string {
  return getActiveCredential()?.activeModel ?? "";
}

export function hasCredentials(): boolean {
  return getActiveCredential() !== null;
}

export function getActiveThinkingEnabled(): boolean | undefined {
  return getActiveCredential()?.thinkingEnabled;
}

export function getActiveReasoningEffort(): string | undefined {
  return getActiveCredential()?.reasoningEffort;
}

export function getActiveProviderLabel(): string {
  const cred = getActiveCredential();
  if (!cred) return "";
  const provider = findProviderById(cred.providerId);
  return provider ? `${provider.icon} ${provider.label}` : cred.providerId;
}

export function getActiveModelLabel(): string {
  const cred = getActiveCredential();
  if (!cred) return "";
  const provider = findProviderById(cred.providerId);
  const model = provider?.models.find((m) => m.id === cred.activeModel);
  return model?.label ?? cred.activeModel;
}

import type { SkillInfo } from "../session";

/** Surfaces that can expose a slash command. The registry is the single
 * source both the terminal UI and the web composer consume; adding a command
 * here surfaces it everywhere it declares support. */
export type SlashCommandSurface = "terminal" | "web";

/** Machine ids the web composer maps to local handlers. Closed union: the
 * web client refuses registry entries whose action it cannot execute. */
export type SlashCommandWebAction = "toggle-plan" | "new-session" | "continue" | "interrupt";

export type SlashCommandKind =
  | "skill"
  | "skills"
  | "model"
  | "login"
  | "plan"
  | "new"
  | "init"
  | "resume"
  | "fork"
  | "continue"
  | "undo"
  | "mcp"
  | "raw"
  | "exit"
  | "stop";

export type SlashCommandItem = {
  kind: SlashCommandKind;
  name: string;
  label: string;
  description: string;
  surfaces: SlashCommandSurface[];
  webAction?: SlashCommandWebAction;
  skill?: SkillInfo;
  args?: string[];
};

export const BUILTIN_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    kind: "login",
    name: "login",
    label: "/login",
    description: "Select model provider and access method",
    surfaces: ["terminal"],
  },
  {
    kind: "skills",
    name: "skills",
    label: "/skills",
    description: "List available skills",
    surfaces: ["terminal"],
  },
  {
    kind: "model",
    name: "model",
    label: "/model",
    description: "Select model, thinking mode and effort control",
    surfaces: ["terminal"],
  },
  {
    kind: "plan",
    name: "plan",
    label: "/plan",
    description: "Switch the input to Plan Mode",
    surfaces: ["terminal", "web"],
    webAction: "toggle-plan",
  },
  {
    kind: "new",
    name: "new",
    label: "/new",
    description: "Start a fresh conversation",
    surfaces: ["terminal", "web"],
    webAction: "new-session",
  },
  {
    kind: "init",
    name: "init",
    label: "/init",
    description: "Initialize an AGENTS.md file with instructions for LLM",
    surfaces: ["terminal"],
  },
  {
    kind: "resume",
    name: "resume",
    label: "/resume",
    description: "Pick a previous conversation to continue",
    surfaces: ["terminal"],
  },
  {
    kind: "fork",
    name: "fork",
    label: "/fork",
    description: "Fork the current conversation",
    surfaces: ["terminal"],
  },
  {
    kind: "continue",
    name: "continue",
    label: "/continue",
    description: "Continue the active conversation or pick one to resume",
    surfaces: ["terminal", "web"],
    webAction: "continue",
  },
  {
    kind: "undo",
    name: "undo",
    label: "/undo",
    description: "Restore code and/or conversation to a previous point",
    surfaces: ["terminal"],
  },
  {
    kind: "mcp",
    name: "mcp",
    label: "/mcp",
    description: "Show MCP server status and available tools",
    surfaces: ["terminal"],
  },
  {
    kind: "raw",
    name: "raw",
    label: "/raw",
    args: ["lite", "normal", "raw-scrollback"],
    description: "Toggle display mode for viewing or collapsing reasoning content",
    surfaces: ["terminal"],
  },
  {
    kind: "exit",
    name: "exit",
    label: "/exit",
    description: "Quit CropCode CLI",
    surfaces: ["terminal"],
  },
  {
    kind: "stop",
    name: "stop",
    label: "/stop",
    description: "Stop the task currently running",
    surfaces: ["web"],
    webAction: "interrupt",
  },
];

export function buildSlashCommands(skills: SkillInfo[]): SlashCommandItem[] {
  const skillItems: SlashCommandItem[] = skills.map((skill) => ({
    kind: "skill",
    name: skill.name,
    label: `/${skill.name}`,
    description: skill.description || "(no description)",
    surfaces: ["terminal"],
    skill,
  }));
  return [...skillItems, ...BUILTIN_SLASH_COMMANDS];
}

/** Commands a given surface should list. Keeps surface-only entries (e.g.
 * web-only /stop) out of surfaces that cannot execute them. */
export function forSurface(items: SlashCommandItem[], surface: SlashCommandSurface): SlashCommandItem[] {
  return items.filter((item) => item.surfaces.includes(surface));
}

export function filterSlashCommands(items: SlashCommandItem[], token: string): SlashCommandItem[] {
  if (!token.startsWith("/")) {
    return [];
  }
  const query = token.slice(1).toLowerCase();
  if (!query) {
    return items;
  }
  return items.filter((item) => item.name.toLowerCase().includes(query));
}

export function findExactSlashCommand(items: SlashCommandItem[], token: string): SlashCommandItem | null {
  if (!token.startsWith("/")) {
    return null;
  }
  const query = token.slice(1);
  const matches = items.filter((item) => item.name === query);
  return matches.find((item) => item.kind !== "skill") ?? matches[0] ?? null;
}

export function formatSlashCommandDescription(description: string): string {
  return (description || "(no description)").trim().replace(/\s+/g, " ");
}

export function formatSlashCommandLabel(item: SlashCommandItem): string {
  return item.kind === "skill" && item.skill?.isLoaded ? `${item.label} ✓` : item.label;
}

import React from "react";
import { render } from "ink";
import { setShellIfWindows, checkForNpmUpdate, promptForPendingUpdate, type PackageInfo } from "@YuanyuanMa03/cropcode-core";
import { AppContainer } from "./ui";

const args = process.argv.slice(2);
const packageInfo = readPackageInfo();

// Handle marketplace CLI subcommands before TUI launch
if (args[0] === "marketplace" || args[0] === "plugin") {
  void handleMarketplaceCommand(args).then(
    () => process.exit(0),
    () => process.exit(1)
  );
} else if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${packageInfo.version || "unknown"}\n`);
  process.exit(0);
} else if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(
    [
      "cropcode - CropCode CLI",
      "",
      "Usage:",
      "  cropcode                              Launch the interactive TUI in the current directory",
      "  cropcode -p <prompt>                  Launch with a pre-filled prompt",
      "  cropcode --prompt <prompt>            Same as -p",
      "  cropcode --version                    Print the version",
      "  cropcode --help                       Show this help",
      "",
      "Marketplace:",
      "  cropcode marketplace add <url>        Register a plugin marketplace",
      "  cropcode marketplace list             List registered marketplaces",
      "  cropcode marketplace remove <name>    Remove a marketplace",
      "  cropcode plugin install <n>@<m>       Install a plugin from a marketplace",
      "  cropcode plugin list                  List installed plugins",
      "  cropcode plugin remove <name>         Remove an installed plugin",
      "",
      "Configuration:",
      "  ~/.cropcode/settings.json    User-level API key, model, base URL",
      "  ./.cropcode/settings.json    Project-level settings",
      "  ~/.agents/skills/*/SKILL.md  User-level skills",
      "  ./.agents/skills/*/SKILL.md  Project-level skills",
      "  ./.cropcode/skills/*/SKILL.md Legacy project-level skills",
      "",
      "Inside the TUI:",
      "  enter            Send the prompt",
      "  shift+enter      Insert a newline",
      "  home/end         Move within the current line",
      "  alt+left/right   Move by word",
      "  ctrl+w           Delete the previous word",
      "  ctrl+v           Paste an image from the clipboard",
      "  ctrl+x           Clear pasted images",
      "  esc              Interrupt the current model turn",
      "  /                Open the skills/commands menu",
      "  /skills          List available skills",
      "  /model           Select model, thinking mode and effort control",
      "  /new             Start a fresh conversation",
      "  /init            Initialize an AGENTS.md file with instructions for LLM",
      "  /resume          Pick a previous conversation to continue",
      "  /continue        Continue the active conversation, or resume one if empty",
      "  /undo            Restore code and/or conversation to a previous point",
      "  /mcp             Show MCP server status and available tools",
      "  /raw             Toggle display mode for viewing or collapsing reasoning content",
      "  /exit            Quit",
      "  ctrl+d twice     Quit",
    ].join("\n") + "\n"
  );
  process.exit(0);
}

function extractInitialPrompt(args: string[]): string | undefined {
  const promptIndex = args.findIndex((arg) => arg === "-p" || arg === "--prompt");
  if (promptIndex !== -1 && promptIndex + 1 < args.length) {
    return args[promptIndex + 1];
  }
  return undefined;
}

let initialPrompt = extractInitialPrompt(args);
const projectRoot = process.cwd();
configureWindowsShell();

const isMarketplaceCommand = args[0] === "marketplace" || args[0] === "plugin";

if (isMarketplaceCommand) {
  // Already handled above; wait for the async handler to exit.
} else {
  if (!process.stdin.isTTY) {
    process.stderr.write(
      "cropcode requires an interactive terminal (TTY). " + "Re-run from a real terminal session.\n"
    );
    process.exit(1);
  }
  void main();
}

async function handleMarketplaceCommand(argv: string[]): Promise<void> {
  const { addMarketplace, removeMarketplace, listMarketplaces, installPlugin, removePlugin, listInstalledPlugins } =
    await import("./marketplace");
  const subcommand = argv[0];
  const action = argv[1];

  try {
    if (subcommand === "marketplace") {
      if (action === "add") {
        const url = argv[2];
        if (!url) {
          process.stderr.write("Usage: cropcode marketplace add <git-url|github-repo> [--ref <branch>]\n");
          process.exit(1);
        }
        const refIdx = argv.indexOf("--ref");
        const ref = refIdx !== -1 && argv[refIdx + 1] ? argv[refIdx + 1] : undefined;

        // Parse source
        const isLocalPath = url.startsWith("/") || url.startsWith("./") || url.startsWith("~");
        const source = isLocalPath
          ? { source: "directory" as const, path: url.replace(/^~/, process.env.HOME ?? "~") }
          : url.includes("://")
            ? { source: "url" as const, url, ref }
            : { source: "github" as const, repo: url, ref };

        // Derive marketplace name from repo
        const name = url.includes("/")
          ? url
              .split("/")
              .pop()!
              .replace(/\.git$/, "")
          : url;

        process.stdout.write(`Fetching marketplace "${name}"...\n`);
        const manifest = addMarketplace(name, source);
        process.stdout.write(`[OK] Marketplace "${name}" added.\n`);
        process.stdout.write(`  ${manifest.description ?? manifest.name}\n`);
        process.stdout.write(`  Plugins: ${manifest.plugins.map((p) => p.name).join(", ")}\n`);
      } else if (action === "list") {
        const marketplaces = listMarketplaces();
        if (marketplaces.length === 0) {
          process.stdout.write("No marketplaces registered. Use: cropcode marketplace add <url>\n");
          return;
        }
        for (const mp of marketplaces) {
          process.stdout.write(`\n[${mp.name}]${mp.manifest?.description ? ` — ${mp.manifest.description}` : ""}\n`);
          if (mp.manifest) {
            for (const p of mp.manifest.plugins) {
              process.stdout.write(`   • ${p.name}: ${p.description}\n`);
            }
          } else {
            process.stdout.write(`   (could not load manifest)\n`);
          }
        }
      } else if (action === "remove") {
        const name = argv[2];
        if (!name) {
          process.stderr.write("Usage: cropcode marketplace remove <name>\n");
          process.exit(1);
        }
        removeMarketplace(name);
        process.stdout.write(`[OK] Marketplace "${name}" removed.\n`);
      } else {
        process.stderr.write(
          "Usage:\n  cropcode marketplace add <git-url|github-repo> [--ref <branch>]\n  cropcode marketplace list\n  cropcode marketplace remove <name>\n"
        );
      }
    } else if (subcommand === "plugin") {
      if (action === "install") {
        const pluginRef = argv[2];
        if (!pluginRef || !pluginRef.includes("@")) {
          process.stderr.write("Usage: cropcode plugin install <plugin-name>@<marketplace-name>\n");
          process.exit(1);
        }
        const [pluginName, marketplaceName] = pluginRef.split("@");
        process.stdout.write(`Installing plugin "${pluginName}" from "${marketplaceName}"...\n`);
        const skills = installPlugin(pluginName, marketplaceName);
        process.stdout.write(`[OK] Plugin "${pluginName}" installed.\n`);
        if (skills.length > 0) {
          process.stdout.write(`  Skills linked: ${skills.join(", ")}\n`);
        }
      } else if (action === "list") {
        const plugins = listInstalledPlugins();
        if (plugins.length === 0) {
          process.stdout.write("No plugins installed. Use: cropcode plugin install <name>@<marketplace>\n");
          return;
        }
        for (const { name, config } of plugins) {
          process.stdout.write(
            `  • ${name} (from ${config.marketplace}, installed ${config.installedAt.split("T")[0]})\n`
          );
        }
      } else if (action === "remove") {
        const name = argv[2];
        if (!name) {
          process.stderr.write("Usage: cropcode plugin remove <name>\n");
          process.exit(1);
        }
        removePlugin(name);
        process.stdout.write(`[OK] Plugin "${name}" removed.\n`);
      } else {
        process.stderr.write(
          "Usage:\n  cropcode plugin install <plugin-name>@<marketplace-name>\n  cropcode plugin list\n  cropcode plugin remove <name>\n"
        );
      }
    }
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const isPortableDistribution = process.env.CROPCODE_DISTRIBUTION === "portable";
  if (!isPortableDistribution) {
    const updatePromptResult = await promptForPendingUpdate(packageInfo);
    if (updatePromptResult.installed) {
      process.exit(0);
    }
  }

  const restartRef: { current: (() => void) | null } = { current: null };

  function startApp(): void {
    let restarting = false;
    const appInitialPrompt = initialPrompt;
    initialPrompt = undefined;
    const inkInstance = render(
      <AppContainer
        projectRoot={projectRoot}
        version={packageInfo.version}
        initialPrompt={appInitialPrompt}
        onRestart={() => restartRef.current?.()}
      />,
      { exitOnCtrlC: false }
    );

    restartRef.current = () => {
      restarting = true;
      process.stdout.write("\u001B[2J\u001B[3J\u001B[H");
      inkInstance.unmount();
      startApp();
    };

    inkInstance.waitUntilExit().then(() => {
      if (!restarting) {
        restartRef.current = null;
        process.exit(0);
      }
    });
  }

  if (!isPortableDistribution) {
    void checkForNpmUpdate(packageInfo);
  }

  startApp();
}

function configureWindowsShell(): void {
  process.env.NoDefaultCurrentDirectoryInExePath = "1";
  try {
    setShellIfWindows();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`cropcode: ${message}\n`);
    process.exit(1);
  }
}

function readPackageInfo(): PackageInfo {
  try {
    const pkg = require("../package.json") as { name?: unknown; version?: unknown };
    return {
      name: typeof pkg.name === "string" ? pkg.name : "cropcode",
      version: typeof pkg.version === "string" ? pkg.version : "",
    };
  } catch {
    return { name: "cropcode", version: "" };
  }
}

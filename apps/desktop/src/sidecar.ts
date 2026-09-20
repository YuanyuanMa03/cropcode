import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

/** How the desktop shell reaches a CropCode CLI entry that can run `web`. */
export type SidecarSpec = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

/**
 * Build the sidecar command that starts the CropCode web host.
 *
 * The shell never requires a system Node.js: in every mode the bundled
 * Electron executable is re-used as the Node runtime via
 * ELECTRON_RUN_AS_NODE=1 (the DSH desktop pattern). The sidecar is the
 * same `cropcode web` server the CLI ships, so the desktop loads the exact
 * web surface the browser mode serves — one kernel, aligned surfaces.
 */
export function buildSidecarSpec(options: {
  electronExecutable: string;
  cliEntry: string;
  port?: number;
  env?: NodeJS.ProcessEnv;
}): SidecarSpec {
  return {
    command: options.electronExecutable,
    args: [options.cliEntry, "web", "--port", String(options.port ?? 0)],
    env: { ...(options.env ?? process.env), ELECTRON_RUN_AS_NODE: "1", ELECTRON_NO_ATTACH_CONSOLE: "1" },
  };
}

/**
 * Extract the tokened local URL the web server prints on startup. The shell
 * loads it once; the page moves the token into its cookie immediately.
 */
export function parseWebHostUrl(output: string): string | null {
  const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/#token=[0-9a-f]+/);
  return match ? match[0] : null;
}

/**
 * Resolve the CLI entry the shell should launch. In a packaged app the
 * bundled copy wins; a dev checkout falls back to the workspace build.
 */
export function resolveCliEntry(repoRoot: string, packagedEntry: string | null): string | null {
  if (packagedEntry && existsSync(packagedEntry)) return packagedEntry;
  const devEntry = join(repoRoot, "packages/cli/dist/cli.js");
  return existsSync(devEntry) ? devEntry : null;
}

export type SidecarHandle = { child: ChildProcess };

export function startSidecar(spec: SidecarSpec): SidecarHandle {
  const child = spawn(spec.command, spec.args, {
    env: spec.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { child };
}

/** Resolve the repository root from this file's compiled location (dist/src). */
export function resolveRepoRoot(fromFile: string): string {
  return join(fromFile, "..", "..", "..");
}

/**
 * The CLI rejects --port 0, so the shell picks a free port itself: bind(0),
 * release, then hand the number to the sidecar.
 */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        if (port > 0) resolve(port);
        else reject(new Error("failed to acquire a free port"));
      });
    });
    server.once("error", reject);
  });
}

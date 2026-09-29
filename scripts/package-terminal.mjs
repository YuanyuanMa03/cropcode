import { cp, mkdir, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { stageThirdPartyNotices } from "./third-party-notices.mjs";
await import("./build-terminal-runtime.mjs");
const root = resolve(import.meta.dirname, "..");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const name = `CropCode-${version}-${process.platform}-${process.arch}`;
const stage = join(root, "release", name);
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, "bin"), { recursive: true });
await cp(join(root, "release/.terminal-runtime"), join(stage, "runtime"), { recursive: true });
await stageThirdPartyNotices(stage);
await cp(join(root, "LICENSE"), join(stage, "LICENSE"));
await cp(join(root, "NOTICE.md"), join(stage, "NOTICE.md"));
const launcher = join(stage, "bin/cropcode");
await writeFile(
  launcher,
  '#!/bin/sh\nset -eu\nCROPCODE_RUNTIME_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../runtime" && pwd)"\nexport ZCODE_BUILTIN_PROVIDER_CONFIG_FILE="$CROPCODE_RUNTIME_DIR/provider.json"\nexec "$CROPCODE_RUNTIME_DIR/node" "$CROPCODE_RUNTIME_DIR/agent.cjs" "$@"\n',
);
await chmod(launcher, 0o755);
await writeFile(
  join(stage, "README.txt"),
  "CropCode 2.0\nRun bin/cropcode. The bundled runtime requires no system Node installation.\nKeep bin and runtime together; add the bin directory to PATH.\nProvider configuration is shared with the desktop.\n",
);
const packed = spawnSync(
  "tar",
  ["-czf", join(root, "release", `${name}-terminal.tar.gz`), "-C", join(root, "release"), name],
  { stdio: "inherit" },
);
if (packed.status !== 0) throw new Error("Terminal archive creation failed");
console.log(join(root, "release", `${name}-terminal.tar.gz`));

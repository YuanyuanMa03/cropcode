"""Run one live CLI submission, retaining logs outside the repository."""

import json
import os
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RUNS = Path("/tmp/crop-agent-v1")
OLD = Path("/Volumes/Sam-APFS/git/cropcode/packages/cli/dist/cli.js")
NEW = Path("/Users/mayuanyuan/.codex/worktrees/desktop-renewal/cropcode/apps/zcode-cli/packages/cli/dist/zcode.cjs")
NODE = Path.home() / ".local/share/mise/installs/node/24.14.0/bin/node"


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in {"old", "new"} or sys.argv[2] not in {"a", "b"}:
        raise SystemExit("usage: python3 run_cli.py {old|new} {a|b}")
    version, task = sys.argv[1:]
    workspace = RUNS / f"{version}-cli" / task
    prompt = (workspace / "PROMPT.md").read_text() if task == "a" else "Read PROMPT.md and complete the code repair it specifies. Run checks and do not modify raw/yield.csv."
    config = json.loads((Path.home() / ".cropcode-desktop/v2/provider_config.json").read_text())
    provider = config["config"]["providerConfigRules"]["providerRules"][0]["config"]
    key = provider["access"]["apiKey"]
    base = provider["api"]["baseUrl"]
    model = config["config"]["defaultModelSelection"]["modelId"]
    if not key or not base or not model:
        raise SystemExit("active model configuration is incomplete")
    env = os.environ.copy()
    if version == "old":
        env.update(CROPCODE_API_KEY=key, CROPCODE_BASE_URL=base, CROPCODE_MODEL=model)
        command = [str(NODE), str(OLD), "--exec", "--prompt", prompt]
    else:
        command = [str(NODE), str(NEW), "--cwd", str(workspace), "--mode", "yolo", "--prompt", prompt]
    started = time.monotonic()
    try:
        completed = subprocess.run(command, cwd=workspace, env=env, capture_output=True, text=True, timeout=600)
        result = {"exit": completed.returncode, "elapsed_s": round(time.monotonic() - started, 2), "timeout": False}
        stdout, stderr = completed.stdout, completed.stderr
    except subprocess.TimeoutExpired as error:
        result = {"exit": None, "elapsed_s": round(time.monotonic() - started, 2), "timeout": True}
        stdout = (error.stdout or b"").decode(errors="replace") if isinstance(error.stdout, bytes) else error.stdout or ""
        stderr = (error.stderr or b"").decode(errors="replace") if isinstance(error.stderr, bytes) else error.stderr or ""
    log = RUNS / "logs"
    log.mkdir(mode=0o700, exist_ok=True)
    for name, content in (("stdout", stdout), ("stderr", stderr)):
        path = log / f"{version}-cli-{task}.{name}.txt"
        path.write_text(content)
        path.chmod(0o600)
    (log / f"{version}-cli-{task}.json").write_text(json.dumps(result) + "\n")
    print(json.dumps({"version": version, "task": task, **result}))


if __name__ == "__main__":
    main()

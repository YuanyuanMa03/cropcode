import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  appendProjectPermissionAllows,
  computeToolCallPermissions,
  evaluatePermissionScopes,
  hasUserPermissionReplies,
  parseBashSideEffects,
} from "../common/permissions";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("parseBashSideEffects accepts valid scopes and normalizes unsafe values to unknown", () => {
  assert.deepEqual(parseBashSideEffects(["read-in-cwd", "network", "read-in-cwd"]), ["read-in-cwd", "network"]);
  assert.deepEqual(parseBashSideEffects(undefined), ["unknown"]);
  assert.deepEqual(parseBashSideEffects(["read-in-cwd", "unknown"]), ["unknown"]);
  assert.deepEqual(parseBashSideEffects(["mcp"]), ["unknown"]);
});

test("parseBashSideEffects accepts a single string (backward compat with old schema)", () => {
  assert.deepEqual(parseBashSideEffects("network"), ["network"]);
  assert.deepEqual(parseBashSideEffects("read-in-cwd"), ["read-in-cwd"]);
  assert.deepEqual(parseBashSideEffects("mcp"), ["unknown"]);
  assert.deepEqual(parseBashSideEffects("invalid-scope"), ["unknown"]);
});

test("evaluatePermissionScopes applies deny, ask, allow, and default mode precedence", () => {
  const settings = {
    allow: ["read-in-cwd" as const],
    deny: ["write-out-cwd" as const],
    ask: ["network" as const],
    defaultMode: "plan" as const,
  };

  assert.equal(evaluatePermissionScopes(["write-out-cwd"], settings), "deny");
  assert.equal(evaluatePermissionScopes(["network"], settings), "ask");
  assert.equal(evaluatePermissionScopes(["read-in-cwd"], settings), "allow");
  assert.equal(evaluatePermissionScopes(["write-in-cwd"], settings), "ask");
  assert.equal(evaluatePermissionScopes([], settings), "allow");
  assert.equal(evaluatePermissionScopes(["unknown"], settings), "ask");
});

test("evaluatePermissionScopes bypassPermissions allows everything including unknown and deny", () => {
  const bypassSettings = {
    allow: [],
    deny: ["write-out-cwd" as const],
    ask: ["network" as const],
    defaultMode: "bypassPermissions" as const,
  };

  // unknown scope — previously always asked, now bypassed
  assert.equal(evaluatePermissionScopes(["unknown"], bypassSettings), "allow");
  // deny scope — UI promises "绕过所有限制（含deny）"
  assert.equal(evaluatePermissionScopes(["write-out-cwd"], bypassSettings), "allow");
  // ask scope — also bypassed
  assert.equal(evaluatePermissionScopes(["network"], bypassSettings), "allow");
  // mixed scopes including unknown
  assert.equal(evaluatePermissionScopes(["unknown", "write-in-cwd"], bypassSettings), "allow");
  // empty scopes still allow
  assert.equal(evaluatePermissionScopes([], bypassSettings), "allow");
});

test("evaluatePermissionScopes acceptEdits auto-allows file ops, asks for network/mcp/bash", () => {
  const acceptEditsSettings = {
    allow: [],
    deny: [],
    ask: [],
    defaultMode: "acceptEdits" as const,
  };

  // read-only auto-allowed
  assert.equal(evaluatePermissionScopes(["read-in-cwd"], acceptEditsSettings), "allow");
  assert.equal(evaluatePermissionScopes(["read-out-cwd"], acceptEditsSettings), "allow");
  assert.equal(evaluatePermissionScopes(["query-git-log"], acceptEditsSettings), "allow");
  // file writes/deletes auto-allowed
  assert.equal(evaluatePermissionScopes(["write-in-cwd"], acceptEditsSettings), "allow");
  assert.equal(evaluatePermissionScopes(["write-out-cwd"], acceptEditsSettings), "allow");
  assert.equal(evaluatePermissionScopes(["delete-in-cwd"], acceptEditsSettings), "allow");
  // network / mcp / unknown still ask
  assert.equal(evaluatePermissionScopes(["network"], acceptEditsSettings), "ask");
  assert.equal(evaluatePermissionScopes(["mcp"], acceptEditsSettings), "ask");
  assert.equal(evaluatePermissionScopes(["unknown"], acceptEditsSettings), "ask");
  // mixed file + network asks (network triggers ask)
  assert.equal(evaluatePermissionScopes(["write-in-cwd", "network"], acceptEditsSettings), "ask");
});

test("evaluatePermissionScopes ask allows reads, asks for writes/network (same as plan in evaluation layer)", () => {
  const askSettings = {
    allow: [],
    deny: [],
    ask: [],
    defaultMode: "ask" as const,
  };

  // read-only auto-allowed
  assert.equal(evaluatePermissionScopes(["read-in-cwd"], askSettings), "allow");
  assert.equal(evaluatePermissionScopes(["read-out-cwd"], askSettings), "allow");
  assert.equal(evaluatePermissionScopes(["query-git-log"], askSettings), "allow");
  // writes/deletes/network/mcp all ask
  assert.equal(evaluatePermissionScopes(["write-in-cwd"], askSettings), "ask");
  assert.equal(evaluatePermissionScopes(["delete-in-cwd"], askSettings), "ask");
  assert.equal(evaluatePermissionScopes(["network"], askSettings), "ask");
  assert.equal(evaluatePermissionScopes(["mcp"], askSettings), "ask");
  assert.equal(evaluatePermissionScopes(["unknown"], askSettings), "ask");
});

test("computeToolCallPermissions maps tool calls to permission requests", () => {
  const projectRoot = createTempDir("cropcode-permissions-workspace-");
  const plan = computeToolCallPermissions({
    sessionId: "session-1",
    projectRoot,
    settings: {
      allow: ["write-in-cwd"],
      deny: [],
      ask: ["write-out-cwd", "network"],
      defaultMode: "plan",
    },
    resolveSnippetPath: () => path.join(projectRoot, "src", "file.ts"),
    toolCalls: [
      {
        id: "call-write",
        type: "function",
        function: { name: "write", arguments: JSON.stringify({ file_path: "/tmp/out.txt", content: "x" }) },
      },
      {
        id: "call-bash",
        type: "function",
        function: {
          name: "bash",
          arguments: JSON.stringify({ command: "curl https://example.com", sideEffects: ["network"] }),
        },
      },
      {
        id: "call-edit",
        type: "function",
        function: { name: "edit", arguments: JSON.stringify({ snippet_id: "snippet_1" }) },
      },
    ],
  });

  assert.deepEqual(plan.permissions, [
    { toolCallId: "call-write", permission: "ask" },
    { toolCallId: "call-bash", permission: "ask" },
    { toolCallId: "call-edit", permission: "allow" },
  ]);
  assert.deepEqual(
    plan.askPermissions.map((item) => ({ id: item.toolCallId, scopes: item.scopes })),
    [
      { id: "call-write", scopes: ["write-out-cwd"] },
      { id: "call-bash", scopes: ["network"] },
    ]
  );
});

test("computeToolCallPermissions only asks for scopes not already allowed", () => {
  const projectRoot = createTempDir("cropcode-permissions-filter-workspace-");
  const plan = computeToolCallPermissions({
    sessionId: "session-1",
    projectRoot,
    settings: {
      allow: ["read-in-cwd"],
      deny: [],
      ask: [],
      defaultMode: "plan",
    },
    toolCalls: [
      {
        id: "call-bash",
        type: "function",
        function: {
          name: "bash",
          arguments: JSON.stringify({
            command: "curl -s http://localhost:8899/ && ls index.html",
            sideEffects: ["network", "read-in-cwd"],
          }),
        },
      },
    ],
  });

  assert.deepEqual(plan.permissions, [{ toolCallId: "call-bash", permission: "ask" }]);
  assert.deepEqual(
    plan.askPermissions.map((item) => ({ id: item.toolCallId, scopes: item.scopes })),
    [{ id: "call-bash", scopes: ["network"] }]
  );
});

test("appendProjectPermissionAllows writes unique project-level allow scopes", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-");
  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ permissions: { allow: ["read-in-cwd"] } }), "utf8");

  appendProjectPermissionAllows(projectRoot, ["read-in-cwd", "write-in-cwd"]);
  appendProjectPermissionAllows(projectRoot, ["write-in-cwd"]);

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions.allow, ["read-in-cwd", "write-in-cwd"]);
});

test("appendProjectPermissionAllows seeds inherited permissions before adding allow scopes", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-default-");

  appendProjectPermissionAllows(projectRoot, ["query-git-log"], {
    inheritedPermissions: {
      allow: ["read-in-cwd"],
      deny: ["write-out-cwd"],
      ask: ["network"],
      defaultMode: "plan",
    },
  });

  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions, {
    allow: ["read-in-cwd", "query-git-log"],
    deny: ["write-out-cwd"],
    ask: ["network"],
    defaultMode: "plan",
  });
});

test("appendProjectPermissionAllows moves inherited ask and deny scopes into allow", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-move-inherited-");

  appendProjectPermissionAllows(projectRoot, ["network", "write-out-cwd"], {
    inheritedPermissions: {
      allow: ["read-in-cwd"],
      deny: ["write-out-cwd"],
      ask: ["network", "mcp"],
      defaultMode: "plan",
    },
  });

  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions, {
    allow: ["read-in-cwd", "network", "write-out-cwd"],
    deny: [],
    ask: ["mcp"],
    defaultMode: "plan",
  });
});

test("appendProjectPermissionAllows writes inherited permissions even when scope is already allowed", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-inherited-existing-");

  appendProjectPermissionAllows(projectRoot, ["read-in-cwd"], {
    inheritedPermissions: {
      allow: ["read-in-cwd"],
      deny: [],
      ask: ["network"],
      defaultMode: "plan",
    },
  });

  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions, {
    allow: ["read-in-cwd"],
    deny: [],
    ask: ["network"],
    defaultMode: "plan",
  });
});

test("appendProjectPermissionAllows preserves existing project permissions", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-explicit-default-");
  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({ permissions: { allow: ["read-in-cwd"], defaultMode: "plan" } }),
    "utf8"
  );

  appendProjectPermissionAllows(projectRoot, ["query-git-log"], {
    inheritedPermissions: {
      allow: ["write-in-cwd"],
      deny: ["write-out-cwd"],
      ask: ["network"],
      defaultMode: "plan",
    },
  });

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions, {
    allow: ["read-in-cwd", "query-git-log"],
    defaultMode: "plan",
  });
});

test("appendProjectPermissionAllows removes existing ask and deny conflicts", () => {
  const projectRoot = createTempDir("cropcode-permission-settings-existing-conflict-");
  const settingsPath = path.join(projectRoot, ".cropcode", "settings.json");
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({
      permissions: {
        allow: ["read-in-cwd"],
        deny: ["network", "write-out-cwd"],
        ask: ["network", "mcp"],
        defaultMode: "plan",
      },
    }),
    "utf8"
  );

  appendProjectPermissionAllows(projectRoot, ["network"]);

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.deepEqual(settings.permissions, {
    allow: ["read-in-cwd", "network"],
    deny: ["write-out-cwd"],
    ask: ["mcp"],
    defaultMode: "plan",
  });
});

test("hasUserPermissionReplies detects permission reply payloads", () => {
  assert.equal(hasUserPermissionReplies({}), false);
  assert.equal(hasUserPermissionReplies({ permissions: [] }), false);
  assert.equal(hasUserPermissionReplies({ permissions: [{ toolCallId: "call-1", permission: "allow" }] }), true);
  assert.equal(hasUserPermissionReplies({ alwaysAllows: ["network"] }), true);
});

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

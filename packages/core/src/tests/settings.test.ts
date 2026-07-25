import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizePermissionList,
  normalizePermissionDefaultMode,
  normalizePermissions,
  mergePermissionLists,
  mergePermissions,
} from "../settings";
import type { PermissionScope, PermissionDefaultMode } from "../settings";

describe("normalizePermissionList", () => {
  it("returns empty array for undefined", () => {
    assert.deepStrictEqual(normalizePermissionList(undefined), []);
  });

  it("deduplicates scopes", () => {
    const input: PermissionScope[] = ["read-in-cwd", "write-in-cwd", "read-in-cwd"];
    const result = normalizePermissionList(input);
    assert.deepStrictEqual(result, ["read-in-cwd", "write-in-cwd"]);
  });

  it("preserves order of first occurrence", () => {
    const input: PermissionScope[] = ["write-in-cwd", "read-in-cwd", "network"];
    const result = normalizePermissionList(input);
    assert.deepStrictEqual(result, ["write-in-cwd", "read-in-cwd", "network"]);
  });
});

describe("normalizePermissionDefaultMode", () => {
  it("returns valid modes unchanged", () => {
    assert.strictEqual(normalizePermissionDefaultMode("ask"), "ask");
    assert.strictEqual(normalizePermissionDefaultMode("acceptEdits"), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode("plan"), "plan");
    assert.strictEqual(normalizePermissionDefaultMode("bypassPermissions"), "bypassPermissions");
  });

  it("falls back to acceptEdits for invalid or legacy values", () => {
    assert.strictEqual(normalizePermissionDefaultMode(undefined), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode("invalid"), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode(42), "acceptEdits");
    // Legacy modes (allowAll/askAll) are removed and fall back to acceptEdits
    assert.strictEqual(normalizePermissionDefaultMode("allowAll"), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode("askAll"), "acceptEdits");
  });
});

describe("normalizePermissions", () => {
  it("returns all fields with defaults for undefined input", () => {
    const result = normalizePermissions(undefined);
    assert.deepStrictEqual(result, {
      allow: [],
      deny: [],
      ask: [],
      defaultMode: "acceptEdits",
    });
  });

  it("normalizes and deduplicates", () => {
    const result = normalizePermissions({
      allow: ["read-in-cwd", "read-in-cwd", "write-in-cwd"] as PermissionScope[],
      defaultMode: "plan",
    });
    assert.deepStrictEqual(result.allow, ["read-in-cwd", "write-in-cwd"]);
    assert.strictEqual(result.defaultMode, "plan");
  });
});

describe("mergePermissionLists", () => {
  it("merges and deduplicates", () => {
    const result = mergePermissionLists(
      ["read-in-cwd", "write-in-cwd"] as PermissionScope[],
      ["write-in-cwd", "network"] as PermissionScope[]
    );
    assert.deepStrictEqual(result, ["read-in-cwd", "write-in-cwd", "network"]);
  });
});

describe("mergePermissions", () => {
  it("project settings take precedence for defaultMode", () => {
    const result = mergePermissions(
      { permissions: { defaultMode: "plan" } },
      { permissions: { defaultMode: "bypassPermissions" } }
    );
    assert.strictEqual(result.defaultMode, "bypassPermissions");
  });

  it("user defaultMode used when project has no defaultMode", () => {
    const result = mergePermissions({ permissions: { defaultMode: "bypassPermissions" } }, { permissions: {} });
    assert.strictEqual(result.defaultMode, "bypassPermissions");
  });

  it("legacy modes are normalized to acceptEdits", () => {
    const result = mergePermissions(
      { permissions: { defaultMode: "plan" } },
      { permissions: { defaultMode: "allowAll" as unknown as PermissionDefaultMode } }
    );
    // Project explicitly set a (legacy) mode → normalized to acceptEdits, takes precedence.
    assert.strictEqual(result.defaultMode, "acceptEdits");
  });

  it("merges allow lists from both sources", () => {
    const result = mergePermissions(
      { permissions: { allow: ["read-in-cwd"] as PermissionScope[] } },
      { permissions: { allow: ["write-in-cwd"] as PermissionScope[] } }
    );
    assert.deepStrictEqual(result.allow, ["read-in-cwd", "write-in-cwd"]);
  });
});

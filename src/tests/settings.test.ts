import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizePermissionList,
  normalizePermissionDefaultMode,
  normalizePermissions,
  mergePermissionLists,
  mergePermissions,
} from "../settings";
import type { PermissionScope } from "../settings";

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
    assert.strictEqual(normalizePermissionDefaultMode("allowAll"), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode("askAll"), "askAll");
    assert.strictEqual(normalizePermissionDefaultMode("plan"), "plan");
    assert.strictEqual(normalizePermissionDefaultMode("acceptEdits"), "acceptEdits");
    assert.strictEqual(normalizePermissionDefaultMode("bypassPermissions"), "bypassPermissions");
  });

  it("falls back to allowAll for invalid values", () => {
    assert.strictEqual(normalizePermissionDefaultMode(undefined), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode("invalid"), "allowAll");
    assert.strictEqual(normalizePermissionDefaultMode(42), "allowAll");
  });
});

describe("normalizePermissions", () => {
  it("returns all fields with defaults for undefined input", () => {
    const result = normalizePermissions(undefined);
    assert.deepStrictEqual(result, {
      allow: [],
      deny: [],
      ask: [],
      defaultMode: "allowAll",
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
      { permissions: { defaultMode: "allowAll" } },
      { permissions: { defaultMode: "askAll" } }
    );
    assert.strictEqual(result.defaultMode, "askAll");
  });

  it("user defaultMode used when project is allowAll", () => {
    const result = mergePermissions(
      { permissions: { defaultMode: "plan" } },
      { permissions: { defaultMode: "allowAll" } }
    );
    assert.strictEqual(result.defaultMode, "plan");
  });

  it("merges allow lists from both sources", () => {
    const result = mergePermissions(
      { permissions: { allow: ["read-in-cwd"] as PermissionScope[] } },
      { permissions: { allow: ["write-in-cwd"] as PermissionScope[] } }
    );
    assert.deepStrictEqual(result.allow, ["read-in-cwd", "write-in-cwd"]);
  });
});

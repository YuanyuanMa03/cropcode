import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILTIN_SLASH_COMMANDS,
  buildSlashCommands,
  forSurface,
  type SlashCommandItem,
} from "../common/slash-commands";
import type { SkillInfo } from "../session";

test("builtin slash commands are unique and declare at least one surface", () => {
  const names = BUILTIN_SLASH_COMMANDS.map((item) => item.name);
  assert.equal(new Set(names).size, names.length);
  for (const item of BUILTIN_SLASH_COMMANDS) {
    assert.ok(item.surfaces.length >= 1, `${item.name} must declare a surface`);
    assert.ok(new Set(item.surfaces).size === item.surfaces.length, `${item.name} has duplicate surfaces`);
  }
});

test("every web-surface command carries a web action the composer can execute", () => {
  const web = forSurface(BUILTIN_SLASH_COMMANDS, "web");
  assert.deepEqual(
    web.map((item) => item.name).sort(),
    ["continue", "new", "plan", "stop"],
    "web surface exposure is exactly the aligned command set"
  );
  for (const item of web) {
    assert.ok(item.webAction, `${item.name} needs a webAction`);
  }
});

test("terminal surface excludes web-only commands and includes the aligned four", () => {
  const terminal = forSurface(BUILTIN_SLASH_COMMANDS, "terminal").map((item) => item.name);
  assert.ok(!terminal.includes("stop"), "/stop is web-only");
  for (const shared of ["plan", "new", "continue", "login", "model", "exit"]) {
    assert.ok(terminal.includes(shared), `${shared} must stay terminal-visible`);
  }
});

test("skill commands stay terminal-only until the web skills plane exists", () => {
  const skills: SkillInfo[] = [
    { name: "skill-writer", path: "~/.agents/skills/skill-writer/SKILL.md", description: "Write a SKILL.md" },
  ];
  const items: SlashCommandItem[] = buildSlashCommands(skills);
  assert.equal(items[0].kind, "skill");
  assert.deepEqual(items[0].surfaces, ["terminal"]);
  assert.deepEqual(forSurface(items, "web").length, forSurface(BUILTIN_SLASH_COMMANDS, "web").length);
});

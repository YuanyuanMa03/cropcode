import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getDefaultSkillPrompt, getRuntimeContext, getSystemPrompt, getTools } from "../prompt";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("getTools always includes WebSearch", () => {
  const names = getTools().map((tool) => tool.function.name);
  assert.equal(names.includes("WebSearch"), true);
});

test("getTools includes UpdatePlan with string plan schema", () => {
  const tool = getTools().find((candidate) => candidate.function.name === "UpdatePlan");
  assert.ok(tool);
  assert.deepEqual(tool.function.parameters.required, ["plan"]);
  assert.equal((tool.function.parameters.properties.plan as { type?: unknown }).type, "string");
});

test("getSystemPrompt always includes WebSearch docs", () => {
  const prompt = getSystemPrompt("/tmp/project");
  assert.equal(prompt.includes("## WebSearch"), true);
});

test("getSystemPrompt includes UpdatePlan docs", () => {
  const prompt = getSystemPrompt("/tmp/project");
  assert.equal(prompt.includes("## UpdatePlan"), true);
  assert.equal(prompt.includes("The `plan` argument is a markdown string, not an array of step objects."), true);
});

test("getSystemPrompt does not include runtime context", () => {
  const prompt = getSystemPrompt("/tmp/project");
  assert.equal(prompt.includes("# 本地工作区环境"), false);
  assert.equal(prompt.includes('"root path": "/tmp/project"'), false);
});

test("getDefaultSkillPrompt returns built-in skills", () => {
  const prompt = getDefaultSkillPrompt();
  assert.ok(prompt.includes("agent-drift-guard"));
  assert.ok(prompt.includes("karpathy-guidelines"));
  assert.ok(prompt.includes("plan-and-execute"));
});

test("getSystemPrompt does not include current date guidance", () => {
  const now = new Date();
  const unexpected = `今天是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const prompt = getSystemPrompt("/tmp/project");
  assert.equal(prompt.includes(unexpected), false);
});

test("getRuntimeContext includes current date and model guidance", () => {
  const now = new Date();
  const expectedDate = `今天是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const prompt = getRuntimeContext("/tmp/project", "deepseek-v4-pro");
  assert.equal(prompt.includes(expectedDate), true);
  assert.equal(prompt.includes("当前LLM模型为deepseek-v4-pro"), true);
  assert.equal(prompt.includes("# 本地工作区环境"), true);
  assert.equal(prompt.includes('"root path": "/tmp/project"'), true);
});

test("getSystemPrompt renders Read docs for non-multimodal models", () => {
  const prompt = getSystemPrompt("/tmp/project", { model: "deepseek-v4-pro" });
  assert.equal(prompt.includes("the current model is not multimodal"), true);
  assert.equal(prompt.includes("the contents are presented visually"), false);
});

test("getSystemPrompt includes English modular sections", () => {
  const prompt = getSystemPrompt("/tmp/project");
  assert.equal(prompt.includes("# Identity"), true);
  assert.equal(prompt.includes("# Doing Tasks"), true);
  assert.equal(prompt.includes("# Using Your Tools"), true);
  assert.equal(prompt.includes("# Communication Style"), true);
  assert.equal(prompt.includes("# Agricultural Context"), true);
  assert.equal(prompt.includes("# Task Management"), true);
});

test("runtime prompt assets live under templates", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "tools", "web-search.md")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "tools", "read.md.ejs")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "prompts", "init_command.md.ejs")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "skills", "agent-drift-guard.md")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "skills", "plan-and-execute.md")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, "templates", "tools", "read.md")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "docs", "tools")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "docs", "prompts")), false);
});

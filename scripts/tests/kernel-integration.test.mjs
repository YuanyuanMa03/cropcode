import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test(
  "packaged kernel executes tools, persists a resumable session, and refuses writes in plan mode",
  { timeout: 60000 },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "cropcode-kernel-"));
    const project = join(root, "allowed");
    const deniedProject = join(root, "denied");
    const input = "date,tmin_c,tmax_c\n2026-06-01,18,30\n2026-06-02,20,32\n2026-06-03,16,28\n";
    for (const directory of [project, deniedProject]) {
      await mkdir(directory);
      await writeFile(join(directory, "weather.csv"), input);
    }
    let requests = 0;
    const server = createServer(async (request, response) => {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const body = JSON.parse(raw);
      requests++;
      const completed = body.messages.some((message) => message.role === "tool");
      const hasBash = body.tools?.some((tool) => tool.function?.name === "Bash");
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      const send = (delta, finish_reason = null) =>
        response.write(
          `data: ${JSON.stringify({ id: "fixture", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason }] })}\n\n`,
        );
      if (completed || !hasBash) {
        send({ role: "assistant", content: "工具执行阶段结束。" });
        send({}, "stop");
      } else {
        const source =
          'const fs=require("fs");const rows=fs.readFileSync("weather.csv","utf8").trim().split("\\n").slice(1).map(r=>r.split(","));const daily=rows.map(r=>Math.max(0,(+r[1]+ +r[2])/2-10));fs.writeFileSync("result.json",JSON.stringify({daily,total_gdd:daily.reduce((a,b)=>a+b,0)}));';
        send({
          role: "assistant",
          tool_calls: [
            {
              index: 0,
              id: "gdd",
              type: "function",
              function: {
                name: "Bash",
                arguments: JSON.stringify({
                  command: `node -e '${source}'`,
                  description: "计算逐日积温并保存结果",
                }),
              },
            },
          ],
        });
        send({}, "tool_calls");
      }
      response.end("data: [DONE]\n\n");
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const endpoint = `http://127.0.0.1:${server.address().port}/v1`;
    const cli = resolve("apps/zcode-cli/packages/cli/dist/zcode.cjs");
    const run = (args) =>
      new Promise((done, reject) => {
        const child = spawn(process.execPath, [cli, ...args], {
          env: { ...process.env, ZCODE_DATA_BASE_DIR: join(root, "home") },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "",
          stderr = "";
        child.stdout.on("data", (data) => {
          stdout += data;
        });
        child.stderr.on("data", (data) => {
          stderr += data;
        });
        const timer = setTimeout(() => child.kill("SIGTERM"), 25000);
        child.on("error", reject);
        child.on("close", (code) => {
          clearTimeout(timer);
          done({ code, stdout, stderr });
        });
      });
    try {
      const configured = await run([
        "configure",
        "--provider-name",
        "Fixture",
        "--base-url",
        endpoint,
        "--api-format",
        "openai-chat-completions",
        "--model-id",
        "fixture",
      ]);
      assert.equal(configured.code, 0, configured.stderr);
      const task = await run([
        "--cwd",
        project,
        "--mode",
        "yolo",
        "--prompt",
        "读取 weather.csv 并保存积温结果",
        "--json",
      ]);
      assert.equal(task.code, 0, task.stderr);
      assert.deepEqual(JSON.parse(await readFile(join(project, "result.json"), "utf8")), {
        daily: [14, 16, 12],
        total_gdd: 42,
      });
      assert.equal(await readFile(join(project, "weather.csv"), "utf8"), input);
      const sessionId = JSON.parse(task.stdout).sessionId;
      assert.match(sessionId, /^sess_/);
      const resumed = await run([
        "--cwd",
        project,
        "--resume",
        sessionId,
        "--mode",
        "plan",
        "--prompt",
        "确认已有记录",
        "--json",
      ]);
      assert.equal(resumed.code, 0, resumed.stderr);
      assert.equal(JSON.parse(resumed.stdout).sessionId, sessionId);
      const denied = await run([
        "--cwd",
        deniedProject,
        "--mode",
        "plan",
        "--prompt",
        "尝试写入结果",
        "--json",
      ]);
      assert.equal(denied.code, 0, denied.stderr);
      await assert.rejects(readFile(join(deniedProject, "result.json")), { code: "ENOENT" });
      assert.ok(requests >= 3);
    } finally {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
      await rm(root, { recursive: true, force: true });
    }
  },
);

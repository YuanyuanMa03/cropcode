import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { SessionManager, getProjectCode } from "@yuanyuanma03/cropcode-core";
import { startWebServer } from "../web/server";

/** Only the model boundary is simulated; storage, tools, permissions and HTTP are real. */
export async function startCoreFixture() {
  const projectRoot = mkdtempSync(join(tmpdir(), "cropcode-web-core-"));
  writeFileSync(join(projectRoot, "reference.txt"), "reference data");
  const settings = {
    model: "test-model",
    baseURL: "http://fixture.invalid/v1",
    apiKey: "fixture-only-secret",
    permissions: { defaultMode: "askAll" as const, allow: [], deny: [], ask: [] },
  };
  const start = () =>
    startWebServer({
      port: 0,
      projectRoot,
      getSettings: () => settings as any,
      createManager: (options) =>
        new SessionManager({
          ...options,
          createOpenAIClient: () => ({
            model: settings.model,
            baseURL: settings.baseURL,
            thinkingEnabled: false,
            client: {
              chat: {
                completions: {
                  create: async (body: any, options: { signal?: AbortSignal }) => {
                    const last = body.messages.at(-1);
                    const prompt = typeof last.content === "string" ? last.content : "";
                    if (!body.stream) return { choices: [{ message: { content: "集成测试任务" } }] };
                    return (async function* () {
                      if (Array.isArray(body.tools) && last.role === "user" && prompt.startsWith("write")) {
                        yield {
                          choices: [
                            {
                              delta: {
                                tool_calls: [
                                  {
                                    index: 0,
                                    id: "write-call",
                                    type: "function",
                                    function: {
                                      name: "write",
                                      arguments: JSON.stringify({
                                        file_path: join(projectRoot, "result.txt"),
                                        content:
                                          prompt === "write deny" ? "must not be written" : "verified tool output",
                                      }),
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        };
                        yield { choices: [{ delta: {}, finish_reason: "tool_calls" }] };
                      } else {
                        yield { choices: [{ delta: { content: "真实内核流式" } }] };
                        await delay(Array.isArray(body.tools) && prompt === "wait" ? 30_000 : 250, undefined, {
                          signal: options?.signal,
                        });
                        yield { choices: [{ delta: { content: "回复 <img src=x onerror=alert(1)>" } }] };
                        yield { choices: [{ delta: {}, finish_reason: "stop" }] };
                      }
                    })();
                  },
                },
              },
            } as any,
          }),
        }),
    });
  let web = await start();
  return {
    projectRoot,
    get web() {
      return web;
    },
    async restart() {
      await web.close();
      web = await start();
    },
    async close() {
      await web.close();
      rmSync(projectRoot, { recursive: true, force: true });
      rmSync(join(homedir(), ".cropcode", "projects", getProjectCode(projectRoot)), { recursive: true, force: true });
    },
  };
}

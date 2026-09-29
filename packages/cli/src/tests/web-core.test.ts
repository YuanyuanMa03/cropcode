import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { startCoreFixture } from "./web-core-fixture";

test("workbench host uses real core permissions, writes, interruption and persisted history", async (t) => {
  const fixture = await startCoreFixture();
  t.after(() => fixture.close());
  let cookie = "";
  let sessionId: string | null = null;
  const post = (path: string, data: object) =>
    fetch(fixture.web.origin + path, {
      method: "POST",
      headers: { Origin: fixture.web.origin, "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ sessionId, ...data }),
    });
  const connect = async () => {
    const response = await post("/api/connect", { token: new URL(fixture.web.url).hash.slice(7) });
    assert.equal(response.status, 200);
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  };
  const state = async () => {
    const response = await fetch(fixture.web.origin + "/api/state", { headers: { Cookie: cookie } });
    const result = (await response.json()) as any;
    assert.ok(!JSON.stringify(result).includes("fixture-only-secret"));
    return result;
  };
  const settled = async () => {
    for (let n = 0; n < 200; n++) {
      const snapshot = await state();
      sessionId = snapshot.sessionId;
      if (!snapshot.busy) return snapshot;
      await delay(25);
    }
    throw new Error("turn did not settle");
  };
  await connect();
  assert.equal((await post("/api/prompt", { text: "write allow" })).status, 202);
  let snapshot = await settled();
  assert.equal(snapshot.status, "ask_permission", JSON.stringify(snapshot));
  assert.equal(existsSync(join(fixture.projectRoot, "result.txt")), false);
  assert.equal((await post("/api/permission", { decision: "allow", toolCallIds: ["stale"] })).status, 409);
  assert.equal((await post("/api/permission", { decision: "allow", toolCallIds: ["write-call"] })).status, 202);
  snapshot = await settled();
  assert.equal(snapshot.status, "completed");
  assert.equal(readFileSync(join(fixture.projectRoot, "result.txt"), "utf8"), "verified tool output");
  assert.ok(snapshot.messages.some((message: any) => message.role === "tool"));
  const originalId = sessionId;
  const originalMessages = snapshot.messages;
  assert.ok((await state()).revision > snapshot.revision);
  assert.equal((await post("/api/session", { target: null })).status, 200);
  sessionId = null;
  assert.equal((await post("/api/prompt", { text: "write deny" })).status, 202);
  await settled();
  assert.equal((await post("/api/permission", { decision: "deny", toolCallIds: ["write-call"] })).status, 202);
  await settled();
  assert.equal(readFileSync(join(fixture.projectRoot, "result.txt"), "utf8"), "verified tool output");
  assert.equal((await post("/api/session", { target: null })).status, 200);
  sessionId = null;
  assert.equal((await post("/api/prompt", { text: "wait" })).status, 202);
  for (let n = 0; n < 100; n++) {
    snapshot = await state();
    if (snapshot.live) break;
    await delay(20);
  }
  assert.ok(snapshot.live?.text.includes("真实内核流式"), JSON.stringify(snapshot));
  sessionId = snapshot.sessionId;
  assert.equal((await post("/api/interrupt", {})).status, 200);
  assert.equal((await settled()).status, "interrupted");
  await fixture.restart();
  sessionId = null;
  await connect();
  assert.ok((await state()).sessions.some((entry: any) => entry.id === originalId));
  assert.equal((await post("/api/session", { target: originalId })).status, 200);
  assert.deepEqual((await state()).messages, originalMessages);
});

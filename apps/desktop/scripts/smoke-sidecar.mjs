// Sidecar smoke without the Electron binary: exercises exactly what the
// desktop shell does — spawn the CLI `web` host, parse the tokened URL
// from stdout, load the page over HTTP — using the current Node executable
// in place of ELECTRON_RUN_AS_NODE. CI-friendly; run the full window smoke
// with `npm run smoke` where the Electron binary is installed.
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..");
const cliEntry = join(repoRoot, "packages", "cli", "dist", "cli.js");
const { findFreePort } = await import(join(appRoot, "dist", "sidecar.js"));

const child = spawn(process.execPath, [cliEntry, "web", "--port", String(await findFreePort())], {
  env: { ...process.env, ELECTRON_NO_ATTACH_CONSOLE: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let errorText = "";
const url = await new Promise((resolveUrl, reject) => {
  const timeout = setTimeout(() => reject(new Error("host did not start in 60s: " + errorText)), 60_000);
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
    const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/#token=[0-9a-f]+/);
    if (match) {
      clearTimeout(timeout);
      resolveUrl(match[0]);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    errorText += chunk;
  });
  child.once("exit", (code) => {
    clearTimeout(timeout);
    reject(new Error(`host exited early (${code}): ${errorText}`));
  });
});

const page = await fetch(url.replace(/#.*$/, ""));
const html = await page.text();
const assets = await Promise.all(
  ["/app.js", "/style.css"].map(async (asset) => (await fetch(new URL(asset, url.replace(/#.*$/, "")))).status)
);

// The token handshake with plain http.request: undici's fetch stamps
// sec-fetch-site: cross-site, which the (correctly) strict local server
// rejects; real browser/Electron requests never carry that header.
import { request as httpRequest } from "node:http";

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = httpRequest(
      new URL(path, originOf(url)),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            cookie: res.headers["set-cookie"]?.[0]?.split(";")[0],
            body: Buffer.concat(chunks).toString(),
          })
        );
      }
    );
    req.on("error", reject);
    req.end(payload);
  });
}
function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(new URL(path, originOf(url)), { headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on("error", reject);
    req.end();
  });
}
function originOf(full) {
  return new URL(full).origin;
}

const connect = await post("/api/connect", { token: url.split("token=")[1] }, { Origin: originOf(url) });
if (connect.status !== 200) {
  console.error("CONNECT_FAILED", connect.status, connect.body);
  child.kill();
  process.exit(1);
}
const state = await get("/api/state", { Cookie: connect.cookie });
const stateBody = JSON.parse(state.body);

console.log("SMOKE_SIDE_OK", {
  page: page.status,
  htmlHasApp: html.includes("CropCode"),
  assets,
  connect: connect.status,
  state: state.status,
  provider: stateBody.provider,
  configured: stateBody.configured,
});

child.kill();
await new Promise((done) => child.once("exit", done));
process.exit(page.status === 200 && connect.status === 200 && state.status === 200 ? 0 : 1);

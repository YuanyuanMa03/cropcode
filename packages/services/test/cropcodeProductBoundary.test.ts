import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { NodeApiClient } from "../src/providers/api/nodeApiClient.js";
import {
  DEFAULT_ZCODE_ENDPOINT_ORIGIN,
  ZCODE_TELEMETRY_ENABLED,
  ZCODE_TELEMETRY_REPORT_ENDPOINT,
  ZCODE_ARMS_RUM_ENDPOINT,
} from "@zcode/shared";
import { getAppConfigDir, setDataBaseDir } from "../src/paths.js";
import { fetchZCodeBuiltinRemoteRelease } from "../src/model-provider/zcodeBuiltinRemoteConfig.js";
import { isWorkspaceOpenUrl } from "../../desktop/src/main/desktopDeepLinkUrl.js";

test("product account requests fail before network, even with an endpoint override", async () => {
  let calls = 0;
  const client = new NodeApiClient({
    fetchImpl: async () => {
      calls++;
      return new Response("ok");
    },
    resolveZCodeEndpointOrigin: () => "https://override.example",
  });
  for (const origin of [DEFAULT_ZCODE_ENDPOINT_ORIGIN, "https://override.example"]) {
    await assert.rejects(client.request(`${origin}/api/account`), /CropCode/);
  }
  assert.equal(calls, 0);
  assert.equal(await (await client.request("https://model.example/v1/models")).text(), "ok");
  assert.equal(calls, 1);
});

test("bundled provider configuration does not request remote product configuration", async () => {
  let calls = 0;
  const apiClient = new NodeApiClient({
    fetchImpl: async () => {
      calls++;
      return new Response("{}");
    },
  });
  assert.equal(
    await fetchZCodeBuiltinRemoteRelease({
      apiClient,
      endpointOrigin: DEFAULT_ZCODE_ENDPOINT_ORIGIN,
      appVersion: "2.0.0-alpha.1",
      platform: "darwin-arm64",
    }),
    null,
  );
  assert.equal(calls, 0);
});

test("desktop storage and links do not claim upstream or legacy CropCode identities", () => {
  setDataBaseDir("/tmp/cropcode-boundary-test");
  assert.equal(getAppConfigDir(), join("/tmp/cropcode-boundary-test", ".cropcode-desktop", "v2"));
  assert.equal(isWorkspaceOpenUrl(new URL("cropcode://workspace/open?path=/tmp/project")), true);
  assert.equal(isWorkspaceOpenUrl(new URL("zcode://workspace/open?path=/tmp/project")), false);
  assert.equal(ZCODE_TELEMETRY_ENABLED, false);
  assert.equal(ZCODE_TELEMETRY_REPORT_ENDPOINT, "");
  assert.equal(ZCODE_ARMS_RUM_ENDPOINT, "");
});

test("agent telemetry stays disabled with inherited collector environment", async () => {
  const { resolveOtlpTraceEndpoint, prepareModelTelemetryEnv, createModelTelemetry } =
    await import("../../../apps/zcode-cli/packages/telemetry/src/bootstrap.js");
  const inheritedEnv = {
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://collector.example/v1/traces",
    ZCODE_TELEMETRY_ENABLED: "1",
  };
  assert.equal(resolveOtlpTraceEndpoint(inheritedEnv), undefined);
  await prepareModelTelemetryEnv(inheritedEnv);
  assert.equal(createModelTelemetry().enabled, false);
});

test("research workspaces do not register a product marketplace or enable bundled plugins", async () => {
  const { DEFAULT_PLUGIN_MARKETPLACES, DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS } =
    await import("@zcode/shared");
  const { DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS: agentDefaults } =
    await import("../../../apps/zcode-cli/packages/bootstrap/src/app/official-plugin-definitions.js");
  assert.deepEqual(DEFAULT_PLUGIN_MARKETPLACES, []);
  assert.equal(DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS.size, 0);
  assert.equal(agentDefaults.size, 0);
});

test("research entry points do not load remote product scenes", async () => {
  const { createClientScenesService } = await import("../src/client-scenes/clientScenesService.js");
  let calls = 0;
  const apiClient = new NodeApiClient({
    fetchImpl: async () => {
      calls++;
      return new Response("{}");
    },
  });
  const result = await createClientScenesService({ apiClient }).list();
  assert.equal(result.code, 0);
  assert.deepEqual(result.data, []);
  assert.equal(calls, 0);
});

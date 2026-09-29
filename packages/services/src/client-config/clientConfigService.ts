import type { ApiClient } from "@zcode/shared";
import type { IClientConfigService } from "./clientConfig.js";

/** CropCode uses its bundled configuration and never polls a product backend. */
export function createClientConfigService(_dependencies: {
  apiClient: ApiClient;
  resolveRequestContext: () =>
    | { endpointOrigin: string; appVersion: string; platform: string }
    | Promise<{ endpointOrigin: string; appVersion: string; platform: string }>;
}): IClientConfigService {
  return {
    async getSnapshot() {
      return { pluginStoreOrder: null };
    },
  };
}

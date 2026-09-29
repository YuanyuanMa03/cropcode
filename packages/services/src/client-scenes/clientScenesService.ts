import type { ApiClient } from "@zcode/shared";
import type { IClientScenesService } from "./clientScenes.js";

export function createClientScenesService(_dependencies: {
  apiClient: ApiClient;
}): IClientScenesService {
  // 研究入口随界面提供，不加载产品后台的职业与推荐场景。
  return { list: async () => ({ code: 0, msg: "", data: [] }) };
}

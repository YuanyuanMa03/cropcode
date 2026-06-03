/**
 * 测试 SIMPLE 模型适配器
 * 运行: npx tsx src/models/test-simple.ts
 */

import { prepareSimpleModel } from "./simple-adapter";
import type { UserInput } from "./crop-adapter";

async function main() {
  console.log("=== 测试 SIMPLE 模型适配器 ===\n");

  // 测试用例: 南京小麦
  const testInput: UserInput = {
    location: "南京",
    crop: "小麦",
    year: 2023,
    management: {
      sowingDate: "2023-11-01",
      irrigation: "rainfed",
      fertilizer: "normal",
    },
  };

  try {
    const outputDir = await prepareSimpleModel(testInput);
    console.log("\n✓ SIMPLE 模型适配器测试通过！");
    console.log(`输出目录: ${outputDir}`);
  } catch (error) {
    console.error("\n✗ SIMPLE 模型适配器测试失败:", error);
    process.exit(1);
  }
}

main();

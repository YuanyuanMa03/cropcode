/**
 * 测试作物模型适配器
 * 运行: npx tsx src/models/test-adapter.ts
 */

import { runCropModel, type UserInput } from './crop-adapter';

async function main() {
  console.log('=== 测试作物模型适配器 ===\n');

  // 测试用例 1: 南京小麦
  const testInput: UserInput = {
    location: '南京',
    crop: '小麦',
    year: 2023,
    management: {
      sowingDate: '2023-11-01',
      irrigation: 'rainfed',
      fertilizer: 'normal',
    },
  };

  try {
    await runCropModel(testInput);
    console.log('\n✓ 适配器测试通过！');
  } catch (error) {
    console.error('\n✗ 适配器测试失败:', error);
    process.exit(1);
  }
}

main();

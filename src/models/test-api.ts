/**
 * 测试气象和土壤 API
 * 运行: npx tsx src/models/test-api.ts
 */

import { fetchWeatherData, getCoordinates, toSimpleCsv } from "./weather-api";
import { fetchSoilData, toSimpleSoilParams } from "./soil-api";

async function testWeatherAPI() {
  console.log("=== 测试 NASA POWER 气象 API ===");

  const location = getCoordinates("南京");
  if (!location) {
    console.error("未找到南京坐标");
    return;
  }

  console.log(`位置: 南京 (${location.lat}, ${location.lon})`);
  console.log("时间范围: 2023-01-01 至 2023-01-31");

  try {
    const weatherData = await fetchWeatherData(location.lat, location.lon, "20230101", "20230131");

    console.log(`获取到 ${weatherData.length} 天的气象数据`);
    console.log("\n前 5 天数据:");
    weatherData.slice(0, 5).forEach((d) => {
      console.log(`  ${d.date}: Tmax=${d.tmax}°C, Tmin=${d.tmin}°C, Rad=${d.radiation}MJ/m², Rain=${d.rain}mm`);
    });

    // 测试 CSV 转换
    const csv = toSimpleCsv(weatherData.slice(0, 5));
    console.log("\nCSV 格式 (前 5 行):");
    console.log(csv);

    return true;
  } catch (error) {
    console.error("气象 API 测试失败:", error);
    return false;
  }
}

async function testSoilAPI() {
  console.log("\n=== 测试 SoilGrids 土壤 API ===");

  const location = getCoordinates("南京");
  if (!location) {
    console.error("未找到南京坐标");
    return;
  }

  console.log(`位置: 南京 (${location.lat}, ${location.lon})`);

  try {
    const soilData = await fetchSoilData(location.lat, location.lon, "0-30cm");

    console.log("\n土壤数据:");
    console.log(`  砂粒: ${soilData.sand.toFixed(1)}%`);
    console.log(`  粉粒: ${soilData.silt.toFixed(1)}%`);
    console.log(`  黏粒: ${soilData.clay.toFixed(1)}%`);
    console.log(`  pH: ${soilData.ph.toFixed(1)}`);
    console.log(`  有机碳: ${soilData.organicCarbon.toFixed(1)} g/kg`);
    console.log(`  容重: ${soilData.bulkDensity.toFixed(2)} g/cm³`);

    // 测试转换为模型参数
    const modelParams = toSimpleSoilParams(soilData);
    console.log("\n模型参数:");
    Object.entries(modelParams).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value === "number" ? value.toFixed(3) : value}`);
    });

    return true;
  } catch (error) {
    console.error("土壤 API 测试失败:", error);
    return false;
  }
}

async function main() {
  console.log("开始 API 测试...\n");

  const weatherOk = await testWeatherAPI();
  const soilOk = await testSoilAPI();

  console.log("\n=== 测试结果 ===");
  console.log(`气象 API: ${weatherOk ? "✓ 通过" : "✗ 失败"}`);
  console.log(`土壤 API: ${soilOk ? "✓ 通过" : "✗ 失败"}`);

  if (weatherOk && soilOk) {
    console.log("\n所有 API 测试通过！可以开始集成作物模型。");
  } else {
    console.log("\n部分 API 测试失败，请检查网络连接或 API 可用性。");
  }
}

main().catch(console.error);

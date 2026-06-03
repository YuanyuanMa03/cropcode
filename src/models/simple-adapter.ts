/**
 * SIMPLE 模型适配器
 * 将用户输入转换为 SIMPLE 模型格式并运行
 */

import * as fs from "fs";
import * as path from "path";
import { prepareModelInput, type UserInput } from "./crop-adapter";
import { toSimpleSoilParams } from "./soil-api";

export type { UserInput };

type WeatherDataItem = {
  date: string;
  radiation: number;
  tmax: number;
  tmin: number;
  rain: number;
  humidity?: number;
  wind?: number;
};

type CultivarData = {
  crop: string;
  variety: string;
  TSUM1?: number;
  TSUM2?: number;
  HI?: number;
};

type TreatmentData = {
  crop: string;
  sowingDate: string;
  irrigation?: string;
};

type SoilParams = Record<string, number>;

// 转换为 SIMPLE 模型的气象文件格式
// 格式: DATE, SRAD, TMAX, TMIN, RAIN, DEWP, WIND
function convertWeatherToSimple(weatherData: WeatherDataItem[], outputPath: string): void {
  const header =
    "*WEATHER DATA : NASA POWER\n" +
    "\n" +
    "@ INSI      LAT     LONG  ELEV   TAV   AMP REFHT WNDHT\n" +
    "  NASA  32.060   118.78    20  15.0  15.0  -99.0  -99.0\n" +
    "DATE  SRAD  TMAX  TMIN  RAIN  DEWP  WIND\n";

  const rows = weatherData.map((d: WeatherDataItem) => {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = `${year.toString().slice(-2)}${dayOfYear.toString().padStart(3, "0")}`;
    // 格式: DATE SRAD TMAX TMIN RAIN DEWP WIND
    return `${dateStr} ${d.radiation.toFixed(1).padStart(5)} ${d.tmax.toFixed(1).padStart(5)} ${d.tmin.toFixed(1).padStart(5)} ${d.rain.toFixed(1).padStart(5)} ${(d.humidity || 0).toFixed(1).padStart(5)} ${(d.wind || 0).toFixed(1).padStart(5)}`;
  });

  fs.writeFileSync(outputPath, header + rows.join("\n") + "\n");
}

// 转换为 SIMPLE 模型的品种文件格式
function convertCultivarToSimple(cultivar: CultivarData, outputPath: string): void {
  const cropMap: Record<string, string> = {
    小麦: "wheat",
    水稻: "rice",
    玉米: "maize",
    大豆: "soybean",
  };

  const species = cropMap[cultivar.crop] || "wheat";
  const tsum = (cultivar.TSUM1 || 0) + (cultivar.TSUM2 || 0);
  const hi = cultivar.HI || 0.4;
  const i50a = 500;
  const i50b = 200;

  const content = `Species.,Cultivar.,Tsum,HI,I50A,I50B\n${species},${cultivar.variety},${tsum},${hi},${i50a},${i50b}\n`;
  fs.writeFileSync(outputPath, content);
}

// 转换为 SIMPLE 模型的处理文件格式
function convertTreatmentToSimple(treatment: TreatmentData, weatherFile: string, outputPath: string): void {
  const cropMap: Record<string, string> = {
    小麦: "wheat",
    水稻: "rice",
    玉米: "maize",
    大豆: "soybean",
  };

  const species = cropMap[treatment.crop] || "wheat";
  const cultivarName = "冬小麦-长江中下游";
  const sowingDate = treatment.sowingDate.replace(/-/g, "").slice(2);
  const irrigationTrt = treatment.irrigation === "full" ? 2 : 1;

  const content =
    `Species*,Exp*,Trt*,Label,weather,CO2,SowingDate,HarvestDate,SoilName,Cultivar,IrrigationTrt,MaxIntercept,InitialBio,InitialTT,InitialFsolar,NOTE\n` +
    `${species},Custom,1,Custom Simulation,${weatherFile},350,${sowingDate},,CustomSoil,${cultivarName},${irrigationTrt},0.95,1,0,0.001,Custom`;

  fs.writeFileSync(outputPath, content);
}

// 转换为 SIMPLE 模型的管理文件格式
function convertManagementToSimple(treatment: TreatmentData, outputPath: string): void {
  const cropMap: Record<string, string> = {
    小麦: "wheat",
    水稻: "rice",
    玉米: "maize",
    大豆: "soybean",
  };

  const species = cropMap[treatment.crop] || "wheat";
  const water = treatment.irrigation === "full" ? "yes" : "no";

  const content =
    `ON_Off,Species*,Exp*,Trt*,Label,Water,NOTE\n` + `1,${species},Custom,1,Custom Simulation,${water},Custom`;

  fs.writeFileSync(outputPath, content);
}

// 转换为 SIMPLE 模型的土壤文件格式
// 格式: SoilName*,AWC,RCN,DDC,RZD
function convertSoilToSimple(soilParams: SoilParams, outputPath: string): void {
  // 将土壤参数转换为 SIMPLE 模型格式
  // AWC: 有效含水量 (FC - WP)
  const awc = (soilParams["Soil.FC"] - soilParams["Soil.WP"]).toFixed(2);
  // RCN: 径流曲线数 (根据土壤类型)
  const rcn = soilParams["Soil.Type"] <= 2 ? 70 : 65;
  // DDC: 排水系数
  const ddc = 0.5;
  // RZD: 根区深度 (mm)
  const rzd = soilParams["Soil.MaxRootDepth"] * 10;

  const content = `SoilName*,AWC,RCN,DDC,RZD\nCustomSoil,${awc},${rcn},${ddc},${rzd}\n`;
  fs.writeFileSync(outputPath, content);
}

// 生成 SIMPLE 模型的输入文件
export async function generateSimpleModelInput(input: UserInput): Promise<string> {
  console.log("\n=== 生成 SIMPLE 模型输入文件 ===\n");

  const modelInput = await prepareModelInput(input);

  const outputDir = path.join(process.cwd(), "model-input", `${input.location}-${input.crop}-${input.year}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 气象文件
  const weatherFile = `NASA${input.year.toString().slice(-2)}01`;
  const weatherPath = path.join(outputDir, "Weather", `${weatherFile}.WTH`);
  if (!fs.existsSync(path.join(outputDir, "Weather"))) {
    fs.mkdirSync(path.join(outputDir, "Weather"), { recursive: true });
  }
  convertWeatherToSimple(modelInput.weather, weatherPath);
  console.log(`✓ 气象文件: ${weatherPath}`);

  // 品种文件
  const cultivarPath = path.join(outputDir, "Input", "Cultivar.csv");
  if (!fs.existsSync(path.join(outputDir, "Input"))) {
    fs.mkdirSync(path.join(outputDir, "Input"), { recursive: true });
  }
  convertCultivarToSimple(modelInput.cultivar, cultivarPath);
  console.log(`✓ 品种文件: ${cultivarPath}`);

  // 处理文件
  const treatmentPath = path.join(outputDir, "Input", "Treatment.csv");
  convertTreatmentToSimple(modelInput.treatment, weatherFile, treatmentPath);
  console.log(`✓ 处理文件: ${treatmentPath}`);

  // 管理文件
  const managementPath = path.join(outputDir, "Input", "Simulation Management.csv");
  convertManagementToSimple(modelInput.treatment, managementPath);
  console.log(`✓ 管理文件: ${managementPath}`);

  // 土壤文件
  const soilPath = path.join(outputDir, "Input", "Soil.csv");
  const soilParams = toSimpleSoilParams(modelInput.soil);
  convertSoilToSimple(soilParams, soilPath);
  console.log(`✓ 土壤文件: ${soilPath}`);

  console.log(`\n✓ 所有输入文件已生成: ${outputDir}`);
  return outputDir;
}

// 主函数
export async function prepareSimpleModel(input: UserInput): Promise<string> {
  return await generateSimpleModelInput(input);
}

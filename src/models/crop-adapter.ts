/**
 * 作物模型适配器
 * 将用户输入转换为模型参数
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fetchWeatherData, getCoordinates, toSimpleCsv, type WeatherData } from './weather-api';
import { fetchSoilData, toSimpleSoilParams, type SoilData } from './soil-api';

export interface UserInput {
  location: string;        // "南京"
  crop: string;            // "小麦" | "水稻" | "玉米" | "大豆"
  year: number;            // 2024
  management?: {
    sowingDate?: string;   // "2024-04-15"
    irrigation?: 'rainfed' | 'full';
    fertilizer?: 'low' | 'normal' | 'high';
  };
}

export interface ModelInput {
  weather: WeatherData[];
  soil: SoilData;
  cultivar: CultivarParams;
  treatment: TreatmentParams;
}

export interface CultivarParams {
  crop: string;
  variety: string;
  // 生长参数
  TSUM1: number;          // 出苗到开花的积温 (°C·day)
  TSUM2: number;          // 开花到成熟的积温 (°C·day)
  SPAN: number;           // 叶片寿命 (day)
  TBASE: number;          // 基础温度 (°C)
  // 形态参数
  SLA: number;            // 比叶面积 (ha/kg)
  RGRL: number;           // 相对生长率 (1/day)
  // 产量参数
  HI: number;             // 收获指数
  TDWI: number;           // 初始干重 (kg/ha)
}

export interface TreatmentParams {
  crop: string;
  sowingDate: string;
  harvestDate?: string;
  irrigation: 'rainfed' | 'full';
  fertilizer: 'low' | 'normal' | 'high';
}

// 内置品种参数（中国典型品种）
const CULTIVAR_DB: Record<string, CultivarParams[]> = {
  '小麦': [
    {
      crop: '小麦',
      variety: '冬小麦-黄淮海',
      TSUM1: 800,
      TSUM2: 600,
      SPAN: 30,
      TBASE: 0,
      SLA: 0.0022,
      RGRL: 0.009,
      HI: 0.45,
      TDWI: 150,
    },
    {
      crop: '小麦',
      variety: '冬小麦-长江中下游',
      TSUM1: 750,
      TSUM2: 550,
      SPAN: 28,
      TBASE: 0,
      SLA: 0.0024,
      RGRL: 0.008,
      HI: 0.42,
      TDWI: 140,
    },
    {
      crop: '小麦',
      variety: '春小麦-东北',
      TSUM1: 600,
      TSUM2: 500,
      SPAN: 25,
      TBASE: 0,
      SLA: 0.0020,
      RGRL: 0.010,
      HI: 0.40,
      TDWI: 130,
    },
  ],
  '水稻': [
    {
      crop: '水稻',
      variety: '单季稻-长江中下游',
      TSUM1: 900,
      TSUM2: 700,
      SPAN: 35,
      TBASE: 10,
      SLA: 0.0025,
      RGRL: 0.007,
      HI: 0.50,
      TDWI: 100,
    },
  ],
  '玉米': [
    {
      crop: '玉米',
      variety: '夏玉米-黄淮海',
      TSUM1: 700,
      TSUM2: 600,
      SPAN: 30,
      TBASE: 8,
      SLA: 0.0020,
      RGRL: 0.012,
      HI: 0.50,
      TDWI: 120,
    },
  ],
  '大豆': [
    {
      crop: '大豆',
      variety: '夏大豆-黄淮海',
      TSUM1: 650,
      TSUM2: 500,
      SPAN: 28,
      TBASE: 6,
      SLA: 0.0028,
      RGRL: 0.008,
      HI: 0.40,
      TDWI: 100,
    },
  ],
};

// 地区到品种的映射
const REGION_CULTIVAR_MAP: Record<string, Record<string, string>> = {
  '南京': {
    '小麦': '冬小麦-长江中下游',
    '水稻': '单季稻-长江中下游',
  },
  '郑州': {
    '小麦': '冬小麦-黄淮海',
    '玉米': '夏玉米-黄淮海',
    '大豆': '夏大豆-黄淮海',
  },
  '哈尔滨': {
    '小麦': '春小麦-东北',
  },
};

export function getCultivar(location: string, crop: string): CultivarParams {
  // 尝试根据地区选择品种
  const regionMap = REGION_CULTIVAR_MAP[location];
  if (regionMap && regionMap[crop]) {
    const varietyName = regionMap[crop];
    const cultivars = CULTIVAR_DB[crop];
    if (cultivars) {
      const found = cultivars.find(c => c.variety === varietyName);
      if (found) return found;
    }
  }

  // 默认返回第一个品种
  const cultivars = CULTIVAR_DB[crop];
  if (!cultivars || cultivars.length === 0) {
    throw new Error(`未找到作物 ${crop} 的品种参数`);
  }
  return cultivars[0];
}

export function generateTreatment(input: UserInput): TreatmentParams {
  // 根据作物和地区确定播种日期
  const defaultSowingDates: Record<string, Record<string, string>> = {
    '小麦': {
      '南京': `${input.year}-11-01`,
      '郑州': `${input.year}-10-15`,
      '哈尔滨': `${input.year + 1}-04-01`,
    },
    '水稻': {
      '南京': `${input.year}-05-15`,
      '武汉': `${input.year}-04-20`,
    },
    '玉米': {
      '郑州': `${input.year}-06-10`,
    },
    '大豆': {
      '郑州': `${input.year}-06-15`,
    },
  };

  const sowingDate = input.management?.sowingDate || 
    defaultSowingDates[input.crop]?.[input.location] || 
    `${input.year}-04-01`;

  return {
    crop: input.crop,
    sowingDate,
    irrigation: input.management?.irrigation || 'rainfed',
    fertilizer: input.management?.fertilizer || 'normal',
  };
}

export async function prepareModelInput(input: UserInput): Promise<ModelInput> {
  const location = getCoordinates(input.location);
  if (!location) {
    throw new Error(`未找到城市 ${input.location} 的坐标`);
  }

  // 获取气象数据（全年）
  const startDate = `${input.year}0101`;
  const endDate = `${input.year}1231`;
  console.log(`正在获取 ${input.location} ${input.year} 年气象数据...`);
  const weather = await fetchWeatherData(location.lat, location.lon, startDate, endDate);
  console.log(`✓ 获取到 ${weather.length} 天气象数据`);

  // 获取土壤数据
  console.log(`正在获取 ${input.location} 土壤数据...`);
  const soil = await fetchSoilData(location.lat, location.lon);
  console.log(`✓ 获取到土壤数据: ${soil.sand.toFixed(1)}%砂, ${soil.silt.toFixed(1)}%粉, ${soil.clay.toFixed(1)}%黏`);

  // 获取品种参数
  const cultivar = getCultivar(input.location, input.crop);
  console.log(`✓ 品种: ${cultivar.variety}`);

  // 生成处理参数
  const treatment = generateTreatment(input);
  console.log(`✓ 播种日期: ${treatment.sowingDate}`);

  return { weather, soil, cultivar, treatment };
}

// 导出为 SIMPLE 模型输入文件
export async function exportToSimpleModel(
  modelInput: ModelInput,
  outputDir: string
): Promise<void> {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. 写入气象数据
  const weatherCsv = toSimpleCsv(modelInput.weather);
  fs.writeFileSync(path.join(outputDir, 'weather.csv'), weatherCsv);
  console.log(`✓ 气象数据已保存: ${outputDir}/weather.csv`);

  // 2. 写入土壤参数
  const soilParams = toSimpleSoilParams(modelInput.soil);
  fs.writeFileSync(
    path.join(outputDir, 'soil.json'),
    JSON.stringify(soilParams, null, 2)
  );
  console.log(`✓ 土壤参数已保存: ${outputDir}/soil.json`);

  // 3. 写入品种参数
  fs.writeFileSync(
    path.join(outputDir, 'cultivar.json'),
    JSON.stringify(modelInput.cultivar, null, 2)
  );
  console.log(`✓ 品种参数已保存: ${outputDir}/cultivar.json`);

  // 4. 写入处理参数
  fs.writeFileSync(
    path.join(outputDir, 'treatment.json'),
    JSON.stringify(modelInput.treatment, null, 2)
  );
  console.log(`✓ 处理参数已保存: ${outputDir}/treatment.json`);
}

// 主函数：用户输入 → 模型输入
export async function runCropModel(input: UserInput): Promise<void> {
  console.log('\n=== 作物模型参数准备 ===');
  console.log(`位置: ${input.location}`);
  console.log(`作物: ${input.crop}`);
  console.log(`年份: ${input.year}`);
  console.log();

  try {
    // 准备模型输入
    const modelInput = await prepareModelInput(input);

    // 导出到临时目录
    const outputDir = path.join(os.tmpdir(), 'cropcode-model', `${input.location}-${input.crop}-${input.year}`);
    await exportToSimpleModel(modelInput, outputDir);

    console.log('\n=== 参数准备完成 ===');
    console.log(`输出目录: ${outputDir}`);
    console.log('\n下一步: 使用 SIMPLE 模型运行模拟');
  } catch (error) {
    console.error('参数准备失败:', error);
    throw error;
  }
}

// 导出城市列表
export function getSupportedCities(): string[] {
  return Object.keys(getCoordinates('南京') ? { '南京': true } : {});
}

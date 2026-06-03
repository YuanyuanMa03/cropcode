/**
 * SoilGrids API - 获取土壤数据
 * https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html
 */

export interface SoilData {
  // 土壤质地 (%)
  sand: number;
  silt: number;
  clay: number;
  // 化学性质
  ph: number; // pH 值
  organicCarbon: number; // 有机碳 (g/kg)
  // 物理性质
  bulkDensity: number; // 容重 (g/cm³)
  // 深度 (cm)
  depth: string;
}

// SoilGrids API 返回的属性
const SOIL_PROPERTIES = [
  "sand", // 砂粒含量
  "silt", // 粉粒含量
  "clay", // 黏粒含量
  "phh2o", // pH
  "soc", // 有机碳
  "bdod", // 容重
];

export async function fetchSoilData(lat: number, lon: number, depth: string = "0-30cm"): Promise<SoilData> {
  // 分别查询每个属性，避免 API 限制
  const results: Record<string, number> = {};

  for (const prop of SOIL_PROPERTIES) {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=${prop}&depth=${depth}&value=mean`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`SoilGrids API warning for ${prop}: ${response.status}`);
        results[prop] = getDefaultValue(prop);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any;
      const layer = data.properties?.layers?.[0];
      const value = layer?.depths?.[0]?.values?.mean;

      if (value !== null && value !== undefined) {
        results[prop] = value;
      } else {
        // 使用默认值或附近站点数据
        results[prop] = getDefaultValue(prop);
      }
    } catch (error) {
      console.warn(`SoilGrids API error for ${prop}:`, error);
      results[prop] = getDefaultValue(prop);
    }
  }

  // SoilGrids 的值是整数，需要转换
  // sand, silt, clay: g/kg -> %
  // phh2o: pH*10 -> pH
  // soc: dg/kg -> g/kg
  // bdod: cg/cm³ -> g/cm³
  return {
    sand: (results["sand"] || 300) / 10,
    silt: (results["silt"] || 400) / 10,
    clay: (results["clay"] || 300) / 10,
    ph: (results["phh2o"] || 65) / 10,
    organicCarbon: (results["soc"] || 15) / 10,
    bulkDensity: (results["bdod"] || 140) / 100,
    depth,
  };
}

// 默认值（中国典型农田土壤）
function getDefaultValue(property: string): number {
  const defaults: Record<string, number> = {
    sand: 300, // 30%
    silt: 400, // 40%
    clay: 300, // 30%
    phh2o: 65, // pH 6.5
    soc: 15, // 1.5 g/kg
    bdod: 140, // 1.4 g/cm³
  };
  return defaults[property] || 0;
}

// 转换为 SIMPLE 模型所需的土壤参数格式
export function toSimpleSoilParams(soilData: SoilData): Record<string, number> {
  // SIMPLE 模型需要的土壤参数
  return {
    "Soil.Type": getSoilType(soilData.clay, soilData.sand),
    "Soil.MaxRootDepth": 150, // cm
    "Soil.SAT": calculateSAT(soilData.bulkDensity),
    "Soil.FC": calculateFC(soilData.clay, soilData.organicCarbon),
    "Soil.WP": calculateWP(soilData.clay),
    "Soil.K0": calculateK0(soilData.sand, soilData.clay),
    "Soil.pH": soilData.ph,
    "Soil.OC": soilData.organicCarbon,
  };
}

// 根据黏粒和砂粒含量判断土壤类型
function getSoilType(clay: number, sand: number): number {
  if (clay > 40) return 1; // 黏土
  if (clay > 25) return 2; // 壤质黏土
  if (sand > 70) return 3; // 砂土
  if (sand > 50) return 4; // 壤质砂土
  return 5; // 壤土
}

// 饱和含水量 (volumetric)
function calculateSAT(bulkDensity: number): number {
  // 经验公式: SAT = 1 - (BD/2.65)
  return Math.max(0.3, Math.min(0.6, 1 - bulkDensity / 2.65));
}

// 田间持水量
function calculateFC(clay: number, organicCarbon: number): number {
  // 简化公式
  return 0.2 + 0.003 * clay + 0.005 * organicCarbon;
}

// 凋萎点
function calculateWP(clay: number): number {
  return 0.05 + 0.004 * clay;
}

// 饱和导水率
function calculateK0(sand: number, clay: number): number {
  // 简化公式 (cm/day)
  return Math.max(1, 100 * Math.exp(-0.05 * clay) * (sand / 100));
}

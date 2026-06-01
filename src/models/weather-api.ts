/**
 * NASA POWER API - 获取每日气象数据
 * https://power.larc.nasa.gov/docs/services/api/temporal/daily/
 */

export interface WeatherData {
  date: string;
  tmax: number;      // 最高温度 (°C)
  tmin: number;      // 最低温度 (°C)
  radiation: number; // 太阳辐射 (MJ/m²/day)
  rain: number;      // 降水量 (mm)
  humidity: number;  // 相对湿度 (%)
  wind: number;      // 风速 (m/s)
}

export interface Location {
  lat: number;
  lon: number;
}

// 中国主要城市坐标
const CITY_COORDINATES: Record<string, Location> = {
  '南京': { lat: 32.06, lon: 118.78 },
  '北京': { lat: 39.90, lon: 116.40 },
  '上海': { lat: 31.23, lon: 121.47 },
  '广州': { lat: 23.13, lon: 113.26 },
  '成都': { lat: 30.57, lon: 104.07 },
  '武汉': { lat: 30.59, lon: 114.30 },
  '哈尔滨': { lat: 45.75, lon: 126.65 },
  '郑州': { lat: 34.75, lon: 113.65 },
  '长春': { lat: 43.88, lon: 125.32 },
  '济南': { lat: 36.65, lon: 116.99 },
  '沈阳': { lat: 41.80, lon: 123.43 },
  '昆明': { lat: 25.04, lon: 102.71 },
  '西安': { lat: 34.26, lon: 108.94 },
  '杭州': { lat: 30.27, lon: 120.15 },
  '长沙': { lat: 28.23, lon: 112.94 },
};

export function getCoordinates(city: string): Location | null {
  return CITY_COORDINATES[city] || null;
}

export async function fetchWeatherData(
  lat: number,
  lon: number,
  startDate: string,  // YYYYMMDD
  endDate: string     // YYYYMMDD
): Promise<WeatherData[]> {
  const params = [
    'T2M_MAX',      // 最高温度
    'T2M_MIN',      // 最低温度
    'ALLSKY_SFC_SW_DWN', // 太阳辐射
    'PRECTOTCORR',  // 降水量
    'RH2M',         // 相对湿度
    'WS2M',         // 风速
  ].join(',');

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=AG&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NASA POWER API error: ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  const properties = data.properties.parameter;

  // 转换为 WeatherData 数组
  const dates = Object.keys(properties.T2M_MAX);
  return dates.map(date => ({
    date: formatDate(date),
    tmax: properties.T2M_MAX[date],
    tmin: properties.T2M_MIN[date],
    radiation: properties.ALLSKY_SFC_SW_DWN[date],
    rain: properties.PRECTOTCORR[date],
    humidity: properties.RH2M[date],
    wind: properties.WS2M[date],
  }));
}

function formatDate(nasaDate: string): string {
  // NASA 日期格式: YYYYMMDD -> YYYY-MM-DD
  const year = nasaDate.substring(0, 4);
  const month = nasaDate.substring(4, 6);
  const day = nasaDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

// 转换为 SIMPLE 模型所需的 CSV 格式
export function toSimpleCsv(weatherData: WeatherData[]): string {
  const header = 'DATE,TMAX,TMIN,SRAD,RAIN';
  const rows = weatherData.map(d => 
    `${d.date},${d.tmax},${d.tmin},${d.radiation},${d.rain}`
  );
  return [header, ...rows].join('\n');
}

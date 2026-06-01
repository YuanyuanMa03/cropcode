"""
NASA POWER API - Python 版本 (使用 urllib)
来源: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
"""

import json
import urllib.request
from typing import Dict, List, Optional


# 中国主要城市坐标
CITY_COORDINATES = {
    '南京': {'lat': 32.06, 'lon': 118.78},
    '北京': {'lat': 39.90, 'lon': 116.40},
    '上海': {'lat': 31.23, 'lon': 121.47},
    '广州': {'lat': 23.13, 'lon': 113.26},
    '成都': {'lat': 30.57, 'lon': 104.07},
    '武汉': {'lat': 30.59, 'lon': 114.30},
    '哈尔滨': {'lat': 45.75, 'lon': 126.65},
    '郑州': {'lat': 34.75, 'lon': 113.65},
    '长春': {'lat': 43.88, 'lon': 125.32},
    '济南': {'lat': 36.65, 'lon': 116.99},
    '沈阳': {'lat': 41.80, 'lon': 123.43},
    '昆明': {'lat': 25.04, 'lon': 102.71},
    '西安': {'lat': 34.26, 'lon': 108.94},
    '杭州': {'lat': 30.27, 'lon': 120.15},
    '长沙': {'lat': 28.23, 'lon': 112.94},
}


def getCoordinates(city: str) -> Optional[Dict]:
    """获取城市坐标"""
    return CITY_COORDINATES.get(city)


def fetchWeatherData(lat: float, lon: float, start_date: str, end_date: str) -> List[Dict]:
    """
    获取 NASA POWER 气象数据
    
    Args:
        lat: 纬度
        lon: 经度
        start_date: 开始日期 (YYYYMMDD)
        end_date: 结束日期 (YYYYMMDD)
    
    Returns:
        气象数据列表
    """
    params = ','.join([
        'T2M_MAX',      # 最高温度
        'T2M_MIN',      # 最低温度
        'ALLSKY_SFC_SW_DWN',  # 太阳辐射
        'PRECTOTCORR',  # 降水量
        'RH2M',         # 相对湿度
        'WS2M',         # 风速
    ])
    
    url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point"
        f"?parameters={params}"
        f"&community=AG"
        f"&longitude={lon}"
        f"&latitude={lat}"
        f"&start={start_date}"
        f"&end={end_date}"
        f"&format=JSON"
    )
    
    with urllib.request.urlopen(url, timeout=30) as response:
        data = json.loads(response.read().decode('utf-8'))
    
    properties = data['properties']['parameter']
    
    # 转换数据格式
    weather_data = []
    for date_str in properties['T2M_MAX'].keys():
        # 转换日期格式: YYYYMMDD -> YYYY-MM-DD
        year = date_str[:4]
        month = date_str[4:6]
        day = date_str[6:8]
        date = f"{year}-{month}-{day}"
        
        weather_data.append({
            'date': date,
            'tmax': properties['T2M_MAX'][date_str],
            'tmin': properties['T2M_MIN'][date_str],
            'radiation': properties['ALLSKY_SFC_SW_DWN'][date_str],
            'rain': properties['PRECTOTCORR'][date_str],
            'humidity': properties['RH2M'][date_str],
            'wind': properties['WS2M'][date_str],
        })
    
    return weather_data

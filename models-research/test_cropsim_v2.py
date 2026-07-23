"""
测试 CropSim v2 - 使用真实气象数据验证冬小麦生长期
数据来源: NASA POWER API (南京, 2023-2024)

运行: cd /Volumes/SamsungT7/git/cropcode && python3 src/models/test_cropsim_v2.py
"""

import sys
import os
import math
from datetime import datetime, timedelta

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# 导入模型
from cropsim_v2 import (
    CropSim, CropParams, SoilParams, WeatherData, ManagementParams,
    create_winter_wheat_model, create_spring_wheat_model,
    VernalizationParams
)

# 导入气象 API
sys.path.insert(0, os.path.dirname(__file__))
from weather_api import fetchWeatherData, getCoordinates


def calculate_daylength(lat: float, day_of_year: int) -> float:
    """
    计算日长 (小时)
    来源: FAO Irrigation and Drainage Paper 56
    """
    # 太阳赤纬
    j = 2 * math.pi * day_of_year / 365
    sd = 0.3987 * math.sin(j - 1.405)
    sd = math.asin(sd)  # 弧度
    
    # 日落时角
    lat_rad = math.radians(lat)
    cos_sha = -math.tan(lat_rad) * math.tan(sd)
    cos_sha = max(-1, min(1, cos_sha))
    sha = math.acos(cos_sha)
    
    # 日长
    daylength = 24 - 24 * sha / math.pi
    return daylength


def fetch_real_weather(city: str, start_date: str, end_date: str) -> list:
    """
    获取真实气象数据
    来源: NASA POWER API
    """
    location = getCoordinates(city)
    if not location:
        raise ValueError(f"未找到城市 {city} 的坐标")
    
    # 转换日期格式
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    start_str = start.strftime("%Y%m%d")
    end_str = end.strftime("%Y%m%d")
    
    print(f"正在获取 {city} 气象数据 ({start_date} 至 {end_date})...")
    
    # 获取气象数据
    weather_data = fetchWeatherData(
        location['lat'], location['lon'],
        start_str, end_str
    )
    
    print(f"✓ 获取到 {len(weather_data)} 天气象数据")
    
    # 转换为 WeatherData 格式
    weather = []
    for i, d in enumerate(weather_data):
        date = datetime.strptime(d['date'], "%Y-%m-%d")
        
        # 计算日长
        day_of_year = date.timetuple().tm_yday
        daylength = calculate_daylength(location['lat'], day_of_year)
        
        weather.append(WeatherData(
            date=d['date'],
            tmax=d['tmax'],
            tmin=d['tmin'],
            radiation=d['radiation'],
            rain=d['rain'],
            humidity=d.get('humidity', 50),
            wind=d.get('wind', 2),
            daylength=daylength
        ))
    
    return weather


def test_winter_wheat_nanjing():
    """
    测试场景: 黄淮海冬小麦 (南京)
    播种日期: 2023年10月15日
    预期收获: 2024年5月底-6月初
    预期生长期: 约 220-240 天
    """
    print("\n" + "=" * 60)
    print("测试: 黄淮海冬小麦 (南京)")
    print("=" * 60)
    
    # 创建模型
    model = create_winter_wheat_model()
    
    # 获取真实气象数据 (10月-次年6月)
    try:
        weather = fetch_real_weather(
            "南京",
            "2023-10-15",
            "2024-06-30"
        )
    except Exception as e:
        print(f"获取气象数据失败: {e}")
        return None
    
    # 模拟参数
    management = ManagementParams(
        sowing_date="2023-10-15",
        co2=420
    )
    
    # 运行模拟
    print("\n运行模拟...")
    results = model.simulate(weather, management)
    
    # 输出结果
    if len(results) == 0:
        print("✗ 模拟失败: 没有结果")
        return None
    
    print(f"\n模拟结果:")
    print(f"  播种日期: {management.sowing_date}")
    print(f"  收获日期: {results[-1].date}")
    print(f"  生长期: {len(results)} 天")
    print(f"  最终发育阶段 (DVS): {results[-1].dvs:.2f}")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  最终 LAI: {results[-1].lai:.2f}")
    
    # 春化信息
    vern_days = sum(1 for r in results if r.f_v > 0.5)
    print(f"\n春化信息:")
    print(f"  春化天数 (f_v > 0.5): {vern_days} 天")
    print(f"  最终春化状态: {'完成' if results[-1].is_vernalised else '未完成'}")
    print(f"  最终春化因子: {results[-1].f_v:.2f}")
    
    # 发育阶段时间线
    emergence_day = next((r.day for r in results if r.dvs >= 0.1), None)
    anthesis_day = next((r.day for r in results if r.dvs >= 1.0), None)
    maturity_day = len(results)
    
    print(f"\n发育阶段时间线:")
    if emergence_day:
        print(f"  出苗: 第 {emergence_day} 天 ({results[emergence_day-1].date})")
    if anthesis_day:
        print(f"  开花: 第 {anthesis_day} 天 ({results[anthesis_day-1].date})")
    print(f"  成熟: 第 {maturity_day} 天 ({results[-1].date})")
    
    # 每月平均温度
    print(f"\n每月平均温度:")
    monthly_temps = {}
    for r in results:
        month = r.date[:7]
        if month not in monthly_temps:
            monthly_temps[month] = []
        monthly_temps[month].append(r.tmean)
    
    for month, temps in monthly_temps.items():
        print(f"  {month}: {sum(temps)/len(temps):.1f}°C")
    
    # 验证结果合理性
    print(f"\n结果验证:")
    print(f"  (预期生长期: 220-240 天)")
    print(f"  (预期产量: 4000-6000 kg/ha)")
    
    is_valid = True
    
    if len(results) < 200:
        print(f"  ⚠ 生长期偏短: {len(results)} 天")
        is_valid = False
    elif len(results) > 260:
        print(f"  ⚠ 生长期偏长: {len(results)} 天")
        is_valid = False
    else:
        print(f"  ✓ 生长期合理: {len(results)} 天")
    
    if results[-1].yield_val < 2000:
        print(f"  ⚠ 产量偏低: {results[-1].yield_val:.0f} kg/ha")
        is_valid = False
    elif results[-1].yield_val > 8000:
        print(f"  ⚠ 产量偏高: {results[-1].yield_val:.0f} kg/ha")
        is_valid = False
    else:
        print(f"  ✓ 产量合理: {results[-1].yield_val:.0f} kg/ha")
    
    if not results[-1].is_vernalised:
        print(f"  ⚠ 春化未完成")
        is_valid = False
    else:
        print(f"  ✓ 春化完成")
    
    if is_valid:
        print(f"\n✓ 测试通过")
    else:
        print(f"\n✗ 测试失败")
    
    return results


def main():
    print("=" * 60)
    print("CropSim v2 真实气象数据验证")
    print("=" * 60)
    print("\n数据来源:")
    print("  - 气象数据: NASA POWER API (https://power.larc.nasa.gov/)")
    print("  - 作物参数: WOFOST (https://github.com/ajwdewit/WOFOST_crop_parameters)")
    print("  - 春化模型: Wang and Engel (1998)")
    
    results = test_winter_wheat_nanjing()
    
    if results:
        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)


if __name__ == "__main__":
    main()

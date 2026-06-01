"""
测试 CropSim v2 - 多地点验证
数据来源: NASA POWER API

运行: cd /Volumes/SamsungT7/git/cropcode/src/models && python3 test_cropsim_v2_multi.py
"""

import sys
import os
import math
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from cropsim_v2 import (
    CropSim, CropParams, SoilParams, WeatherData, ManagementParams,
    create_winter_wheat_model, create_spring_wheat_model,
    VernalizationParams
)
from weather_api import fetchWeatherData, getCoordinates


def calculate_daylength(lat: float, day_of_year: int) -> float:
    """计算日长 (小时)"""
    j = 2 * math.pi * day_of_year / 365
    sd = 0.3987 * math.sin(j - 1.405)
    sd = math.asin(sd)
    
    lat_rad = math.radians(lat)
    cos_sha = -math.tan(lat_rad) * math.tan(sd)
    cos_sha = max(-1, min(1, cos_sha))
    sha = math.acos(cos_sha)
    
    daylength = 24 - 24 * sha / math.pi
    return daylength


def fetch_real_weather(city: str, start_date: str, end_date: str) -> list:
    """获取真实气象数据"""
    location = getCoordinates(city)
    if not location:
        raise ValueError(f"未找到城市 {city} 的坐标")
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    start_str = start.strftime("%Y%m%d")
    end_str = end.strftime("%Y%m%d")
    
    print(f"  获取 {city} 气象数据 ({start_date} ~ {end_date})...")
    
    weather_data = fetchWeatherData(
        location['lat'], location['lon'],
        start_str, end_str
    )
    
    print(f"  ✓ 获取到 {len(weather_data)} 天气象数据")
    
    weather = []
    for d in weather_data:
        date = datetime.strptime(d['date'], "%Y-%m-%d")
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


def test_scenario(city: str, crop_type: str, start_date: str, end_date: str,
                  expected_days: tuple, expected_yield: tuple):
    """测试单个场景"""
    print(f"\n{'='*60}")
    print(f"测试: {city} {crop_type}")
    print(f"{'='*60}")
    
    # 创建模型
    if '冬小麦' in crop_type:
        model = create_winter_wheat_model()
    else:
        model = create_spring_wheat_model()
    
    # 获取气象数据
    try:
        weather = fetch_real_weather(city, start_date, end_date)
    except Exception as e:
        print(f"  ✗ 获取气象数据失败: {e}")
        return None
    
    # 模拟参数
    management = ManagementParams(
        sowing_date=start_date,
        co2=420
    )
    
    # 运行模拟
    print(f"  运行模拟...")
    results = model.simulate(weather, management)
    
    if len(results) == 0:
        print(f"  ✗ 模拟失败: 没有结果")
        return None
    
    # 输出结果
    print(f"\n  模拟结果:")
    print(f"    播种日期: {start_date}")
    print(f"    收获日期: {results[-1].date}")
    print(f"    生长期: {len(results)} 天")
    print(f"    最终 DVS: {results[-1].dvs:.2f}")
    print(f"    最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"    最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"    最终 LAI: {results[-1].lai:.2f}")
    
    # 春化信息
    if '冬小麦' in crop_type:
        vern_days = sum(1 for r in results if r.f_v > 0.5)
        print(f"\n  春化信息:")
        print(f"    春化天数: {vern_days} 天")
        print(f"    春化状态: {'完成' if results[-1].is_vernalised else '未完成'}")
    
    # 发育阶段
    emergence_day = next((r.day for r in results if r.dvs >= 0.1), None)
    anthesis_day = next((r.day for r in results if r.dvs >= 1.0), None)
    
    print(f"\n  发育阶段:")
    if emergence_day:
        print(f"    出苗: 第 {emergence_day} 天 ({results[emergence_day-1].date})")
    if anthesis_day:
        print(f"    开花: 第 {anthesis_day} 天 ({results[anthesis_day-1].date})")
    print(f"    成熟: 第 {len(results)} 天 ({results[-1].date})")
    
    # 验证结果
    print(f"\n  结果验证:")
    is_valid = True
    
    if expected_days[0] <= len(results) <= expected_days[1]:
        print(f"    ✓ 生长期合理: {len(results)} 天 (预期 {expected_days[0]}-{expected_days[1]})")
    else:
        print(f"    ⚠ 生长期异常: {len(results)} 天 (预期 {expected_days[0]}-{expected_days[1]})")
        is_valid = False
    
    if expected_yield[0] <= results[-1].yield_val <= expected_yield[1]:
        print(f"    ✓ 产量合理: {results[-1].yield_val:.0f} kg/ha (预期 {expected_yield[0]}-{expected_yield[1]})")
    else:
        print(f"    ⚠ 产量异常: {results[-1].yield_val:.0f} kg/ha (预期 {expected_yield[0]}-{expected_yield[1]})")
        is_valid = False
    
    if is_valid:
        print(f"\n  ✓ 测试通过")
    else:
        print(f"\n  ✗ 测试失败")
    
    return results


def main():
    print("=" * 60)
    print("CropSim v2 多地点验证")
    print("=" * 60)
    print("\n数据来源:")
    print("  - 气象数据: NASA POWER API (https://power.larc.nasa.gov/)")
    print("  - 作物参数: WOFOST (https://github.com/ajwdewit/WOFOST_crop_parameters)")
    print("  - 春化模型: Wang and Engel (1998)")
    
    # 测试场景定义
    # (城市, 作物类型, 开始日期, 结束日期, 预期天数范围, 预期产量范围 kg/ha)
    scenarios = [
        # 黄淮海冬小麦
        ("郑州", "冬小麦", "2023-10-10", "2024-06-15", (220, 260), (4000, 7000)),
        ("济南", "冬小麦", "2023-10-15", "2024-06-20", (220, 260), (4000, 7000)),
        
        # 长江中下游冬小麦
        ("南京", "冬小麦", "2023-10-15", "2024-06-30", (220, 260), (4000, 7000)),
        ("武汉", "冬小麦", "2023-10-20", "2024-06-15", (200, 240), (3500, 6000)),
        
        # 东北春小麦
        ("哈尔滨", "春小麦", "2023-04-01", "2023-08-31", (100, 140), (2500, 5000)),
        ("长春", "春小麦", "2023-04-05", "2023-09-05", (100, 140), (2500, 5000)),
    ]
    
    # 运行测试
    all_results = []
    for scenario in scenarios:
        results = test_scenario(*scenario)
        all_results.append(results)
    
    # 汇总
    print("\n" + "=" * 60)
    print("汇总结果")
    print("=" * 60)
    
    passed = 0
    failed = 0
    for i, (scenario, results) in enumerate(zip(scenarios, all_results)):
        city, crop_type = scenario[0], scenario[1]
        if results:
            days = len(results)
            yield_val = results[-1].yield_val
            status = "✓" if results else "✗"
            print(f"  {status} {city} {crop_type}: {days} 天, 产量 {yield_val:.0f} kg/ha")
            if results:
                passed += 1
            else:
                failed += 1
        else:
            print(f"  ✗ {city} {crop_type}: 失败")
            failed += 1
    
    print(f"\n通过: {passed}, 失败: {failed}")
    
    if failed == 0:
        print("\n✓ 所有测试通过")
    else:
        print(f"\n✗ {failed} 个测试失败")


if __name__ == "__main__":
    main()

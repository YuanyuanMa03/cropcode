"""
测试 CropSim 模型 - 多场景验证
运行: python3 src/models/test_cropsim_scenarios.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.models.cropsim import (
    CropSim, CropParams, SoilParams, WeatherData, ManagementParams,
    create_wheat_model, create_rice_model, create_maize_model
)


def generate_summer_weather(days: int, base_tmax: float = 32, base_rad: float = 18) -> list:
    """生成夏季气象数据"""
    import random
    random.seed(42)
    
    weather = []
    for i in range(days):
        # 温度波动
        tmax = base_tmax + random.uniform(-3, 5)
        tmin = tmax - random.uniform(8, 12)
        
        # 辐射波动
        radiation = base_rad + random.uniform(-4, 4)
        radiation = max(5, radiation)
        
        # 随机降雨
        rain = random.uniform(0, 10) if random.random() < 0.3 else 0
        
        weather.append(WeatherData(
            date=f"2023-{(i // 30) + 7:02d}-{(i % 30) + 1:02d}",
            tmax=round(tmax, 1),
            tmin=round(tmin, 1),
            radiation=round(radiation, 1),
            rain=round(rain, 1)
        ))
    
    return weather


def generate_spring_weather(days: int, base_tmax: float = 20, base_rad: float = 12) -> list:
    """生成春季气象数据"""
    import random
    random.seed(42)
    
    weather = []
    for i in range(days):
        tmax = base_tmax + random.uniform(-2, 3) + i * 0.1
        tmin = tmax - random.uniform(6, 10)
        radiation = base_rad + random.uniform(-3, 3) + i * 0.05
        radiation = max(3, radiation)
        rain = random.uniform(0, 5) if random.random() < 0.2 else 0
        
        weather.append(WeatherData(
            date=f"2023-{(i // 30) + 3:02d}-{(i % 30) + 1:02d}",
            tmax=round(tmax, 1),
            tmin=round(tmin, 1),
            radiation=round(radiation, 1),
            rain=round(rain, 1)
        ))
    
    return weather


def test_southern_rice():
    """测试场景1: 华南双季稻"""
    print("\n=== 场景1: 华南双季稻 (广州, 早稻) ===")
    
    crop_params = CropParams(
        tbase=12, topt=30, rue=2.2,
        max_t=38, extreme_t=45,
        s_water=0.3, co2_rue=0.25,
        tsum=2000, hi=0.48,
        i50a=700, i50b=150
    )
    soil_params = SoilParams(awc=0.14, rzd=250)
    model = CropSim(crop_params, soil_params)
    
    # 华南早稻: 3月-7月
    weather = generate_summer_weather(120, base_tmax=33, base_rad=20)
    
    management = ManagementParams(
        sowing_date="2023-03-15",
        co2=420,
        irrigation=True
    )
    
    results = model.simulate(weather, management)
    
    print(f"  播种日期: {management.sowing_date}")
    print(f"  模拟天数: {len(results)} 天")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  积温: {results[-1].tt:.0f} °C·day")
    print(f"  平均光截获: {sum(r.f_solar for r in results) / len(results):.2%}")
    
    return results


def test_northern_wheat():
    """测试场景2: 东北春小麦"""
    print("\n=== 场景2: 东北春小麦 (哈尔滨) ===")
    
    crop_params = CropParams(
        tbase=0, topt=22, rue=2.8,
        max_t=32, extreme_t=40,
        s_water=0.4, co2_rue=0.3,
        tsum=1800, hi=0.42,
        i50a=400, i50b=150
    )
    soil_params = SoilParams(awc=0.15, rzd=500)
    model = CropSim(crop_params, soil_params)
    
    # 东北春小麦: 4月-8月
    weather = generate_spring_weather(130, base_tmax=24, base_rad=15)
    
    management = ManagementParams(
        sowing_date="2023-04-10",
        co2=410
    )
    
    results = model.simulate(weather, management)
    
    print(f"  播种日期: {management.sowing_date}")
    print(f"  模拟天数: {len(results)} 天")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  积温: {results[-1].tt:.0f} °C·day")
    
    return results


def test_yellow_river_wheat():
    """测试场景3: 黄淮海冬小麦"""
    print("\n=== 场景3: 黄淮海冬小麦 (郑州) ===")
    
    crop_params = CropParams(
        tbase=0, topt=25, rue=2.5,
        max_t=35, extreme_t=42,
        s_water=0.5, co2_rue=0.3,
        tsum=2200, hi=0.45,
        i50a=500, i50b=180
    )
    soil_params = SoilParams(awc=0.13, rzd=450)
    model = CropSim(crop_params, soil_params)
    
    # 冬小麦: 10月-次年5月 (简化为春季部分)
    weather = generate_spring_weather(150, base_tmax=22, base_rad=14)
    
    management = ManagementParams(
        sowing_date="2022-10-15",
        co2=415
    )
    
    results = model.simulate(weather, management)
    
    print(f"  播种日期: {management.sowing_date}")
    print(f"  模拟天数: {len(results)} 天")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  积温: {results[-1].tt:.0f} °C·day")
    
    return results


def test_southwest_maize():
    """测试场景4: 西南玉米 (成都)"""
    print("\n=== 场景4: 西南玉米 (成都, 春玉米) ===")
    
    crop_params = CropParams(
        tbase=8, topt=28, rue=3.2,
        max_t=35, extreme_t=42,
        s_water=0.5, co2_rue=0.2,
        tsum=2200, hi=0.52,
        i50a=600, i50b=100
    )
    soil_params = SoilParams(awc=0.16, rzd=500)
    model = CropSim(crop_params, soil_params)
    
    # 春玉米: 4月-8月
    weather = generate_summer_weather(130, base_tmax=30, base_rad=16)
    
    management = ManagementParams(
        sowing_date="2023-04-20",
        co2=420
    )
    
    results = model.simulate(weather, management)
    
    print(f"  播种日期: {management.sowing_date}")
    print(f"  模拟天数: {len(results)} 天")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  积温: {results[-1].tt:.0f} °C·day")
    
    return results


def test_dryland_sorghum():
    """测试场景5: 旱地高粱 (山西)"""
    print("\n=== 场景5: 旱地高粱 (山西太原) ===")
    
    crop_params = CropParams(
        tbase=6, topt=28, rue=2.8,
        max_t=36, extreme_t=44,
        s_water=0.7, co2_rue=0.15,
        tsum=2000, hi=0.40,
        i50a=450, i50b=120
    )
    soil_params = SoilParams(awc=0.10, rzd=400)
    model = CropSim(crop_params, soil_params)
    
    # 高粱: 5月-9月
    weather = generate_summer_weather(120, base_tmax=31, base_rad=19)
    
    management = ManagementParams(
        sowing_date="2023-05-01",
        co2=410
    )
    
    results = model.simulate(weather, management)
    
    print(f"  播种日期: {management.sowing_date}")
    print(f"  模拟天数: {len(results)} 天")
    print(f"  最终生物量: {results[-1].biomass:.0f} kg/ha")
    print(f"  最终产量: {results[-1].yield_val:.0f} kg/ha")
    print(f"  积温: {results[-1].tt:.0f} °C·day")
    print(f"  平均水分胁迫: {sum(r.f_water for r in results) / len(results):.2%}")
    
    return results


def main():
    print("=" * 60)
    print("CropSim 多场景测试")
    print("=" * 60)
    
    test_southern_rice()
    test_northern_wheat()
    test_yellow_river_wheat()
    test_southwest_maize()
    test_dryland_sorghum()
    
    print("\n" + "=" * 60)
    print("所有场景测试完成 ✓")
    print("=" * 60)


if __name__ == "__main__":
    main()

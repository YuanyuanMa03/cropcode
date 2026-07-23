"""
测试 CropSim 模型
运行: python3 src/models/test_cropsim.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.models.cropsim import (
    CropSim, CropParams, SoilParams, WeatherData, ManagementParams,
    create_wheat_model, create_rice_model, create_maize_model
)


def test_temperature_response():
    """测试温度响应函数"""
    model = create_wheat_model()
    
    # 最适温度
    assert model.temperature_response(25) == 1.0
    # 低于基础温度
    assert model.temperature_response(-5) == 0
    # 中间温度
    assert 0 < model.temperature_response(15) < 1
    print("✓ 温度响应函数测试通过")


def test_heat_response():
    """测试热胁迫响应函数"""
    model = create_wheat_model()
    
    # 无胁迫
    assert model.heat_response(30) == 1.0
    # 部分胁迫
    assert 0 < model.heat_response(40) < 1
    # 完全胁迫
    assert model.heat_response(50) == 0
    print("✓ 热胁迫响应函数测试通过")


def test_water_response():
    """测试水分胁迫响应函数"""
    model = create_wheat_model()
    
    # 无干旱
    assert model.water_response(0) == 1.0
    # 部分干旱
    assert 0 < model.water_response(0.5) < 1
    # 完全干旱
    assert model.water_response(2) == 0
    print("✓ 水分胁迫响应函数测试通过")


def test_co2_response():
    """测试 CO2 响应函数"""
    model = create_wheat_model()
    
    # 当前 CO2
    assert model.co2_response(400) >= 1.0
    # 高 CO2
    assert model.co2_response(600) > model.co2_response(400)
    print("✓ CO2 响应函数测试通过")


def test_wheat_simulation():
    """测试小麦模拟"""
    model = create_wheat_model()
    
    # 生成测试气象数据 (10天)
    weather = []
    for i in range(10):
        weather.append(WeatherData(
            date=f"2023-01-{i+1:02d}",
            tmax=15 + i,
            tmin=5 + i,
            radiation=10 + i * 0.5,
            rain=1 if i % 3 == 0 else 0
        ))
    
    management = ManagementParams(
        sowing_date="2023-01-01",
        co2=400
    )
    
    results = model.simulate(weather, management)
    
    assert len(results) > 0
    assert results[-1].biomass > 1  # 应该有生物量积累
    assert results[-1].yield_val > 0  # 应该有产量
    print(f"✓ 小麦模拟测试通过: {len(results)} 天, 生物量={results[-1].biomass:.1f} kg/ha, 产量={results[-1].yield_val:.1f} kg/ha")


def test_rice_simulation():
    """测试水稻模拟"""
    model = create_rice_model()
    
    # 生成测试气象数据 (夏季)
    weather = []
    for i in range(30):
        weather.append(WeatherData(
            date=f"2023-07-{i+1:02d}",
            tmax=32 + (i % 5),
            tmin=24 + (i % 3),
            radiation=18 + (i % 4),
            rain=5 if i % 4 == 0 else 0
        ))
    
    management = ManagementParams(
        sowing_date="2023-07-01",
        co2=400,
        irrigation=True
    )
    
    results = model.simulate(weather, management)
    
    assert len(results) > 0
    assert results[-1].biomass > 100  # 应该有更多生物量
    print(f"✓ 水稻模拟测试通过: {len(results)} 天, 生物量={results[-1].biomass:.1f} kg/ha, 产量={results[-1].yield_val:.1f} kg/ha")


def test_maize_simulation():
    """测试玉米模拟"""
    model = create_maize_model()
    
    # 生成测试气象数据 (夏季)
    weather = []
    for i in range(20):
        weather.append(WeatherData(
            date=f"2023-06-{i+1:02d}",
            tmax=30 + (i % 6),
            tmin=20 + (i % 4),
            radiation=20 + (i % 5),
            rain=3 if i % 5 == 0 else 0
        ))
    
    management = ManagementParams(
        sowing_date="2023-06-01",
        co2=400
    )
    
    results = model.simulate(weather, management)
    
    assert len(results) > 0
    assert results[-1].biomass > 50
    print(f"✓ 玉米模拟测试通过: {len(results)} 天, 生物量={results[-1].biomass:.1f} kg/ha, 产量={results[-1].yield_val:.1f} kg/ha")


def main():
    print("=== CropSim 模型测试 ===\n")
    
    test_temperature_response()
    test_heat_response()
    test_water_response()
    test_co2_response()
    test_wheat_simulation()
    test_rice_simulation()
    test_maize_simulation()
    
    print("\n=== 所有测试通过 ✓ ===")


if __name__ == "__main__":
    main()

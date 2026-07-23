"""
CropSim - 简洁作物生长模拟模型
提取自 SIMPLE 模型核心算法
Author: Mayuanyuan
Date: 2026-05-30
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class WeatherData:
    """气象数据"""
    date: str
    tmax: float  # 最高温度 (°C)
    tmin: float  # 最低温度 (°C)
    radiation: float  # 太阳辐射 (MJ/m²/day)
    rain: float  # 降水量 (mm)
    humidity: float = 50.0  # 相对湿度 (%)
    wind: float = 2.0  # 风速 (m/s)


@dataclass
class SoilParams:
    """土壤参数"""
    awc: float = 0.13  # 有效含水量
    rcn: float = 65  # 径流曲线数
    ddc: float = 0.55  # 排水系数
    rzd: float = 400  # 根区深度 (mm)
    wuc: float = 0.096  # 水分利用系数


@dataclass
class CropParams:
    """作物参数"""
    # 物种参数
    tbase: float = 0  # 基础温度 (°C)
    topt: float = 25  # 最适温度 (°C)
    rue: float = 2.5  # 辐射利用效率 (g/MJ)
    max_t: float = 35  # 最高温度阈值 (°C)
    extreme_t: float = 45  # 极端温度阈值 (°C)
    s_water: float = 0.5  # 水分胁迫敏感系数
    co2_rue: float = 0.3  # CO2 响应系数
    
    # 品种参数
    tsum: float = 2500  # 总积温需求 (°C·day)
    hi: float = 0.45  # 收获指数
    i50a: float = 500  # 光截获参数 A
    i50b: float = 200  # 光截获参数 B
    i50max_h: float = 50  # 热胁迫对 I50B 影响
    i50max_w: float = 50  # 水分胁迫对 I50B 影响
    
    # 生长参数
    fsolar_max: float = 0.95  # 最大光截获率
    init_fsolar: float = 0.001  # 初始光截获率


@dataclass
class ManagementParams:
    """管理参数"""
    sowing_date: str  # 播种日期 (YYYY-MM-DD)
    co2: float = 400  # CO2 浓度 (ppm)
    irrigation: bool = False  # 是否灌溉
    init_bio: float = 1.0  # 初始生物量 (kg/ha)
    init_tt: float = 0  # 初始积温 (°C·day)


@dataclass
class DailyResult:
    """每日模拟结果"""
    day: int
    date: str
    tmean: float
    radiation: float
    tt: float  # 积温
    biomass: float  # 生物量
    yield_val: float  # 产量
    f_solar: float  # 光截获率
    f_temp: float  # 温度响应
    f_water: float  # 水分响应
    f_heat: float  # 热胁迫响应
    f_co2: float  # CO2 响应
    arid: float  # 干旱指数


class CropSim:
    """作物生长模拟模型"""
    
    def __init__(self, crop_params: CropParams, soil_params: SoilParams):
        self.crop = crop_params
        self.soil = soil_params
    
    # ===== 环境响应函数 =====
    
    def temperature_response(self, tmean: float) -> float:
        """温度响应函数"""
        if tmean >= self.crop.topt:
            return 1.0
        else:
            return max((tmean - self.crop.tbase) / (self.crop.topt - self.crop.tbase), 0)
    
    def heat_response(self, tmax: float) -> float:
        """热胁迫响应函数"""
        if tmax <= self.crop.max_t:
            return 1.0
        elif tmax > self.crop.extreme_t:
            return 0.0
        else:
            return max(1 - (tmax - self.crop.max_t) / (self.crop.extreme_t - self.crop.max_t), 0)
    
    def water_response(self, arid: float) -> float:
        """水分胁迫响应函数"""
        return max(0, 1 - self.crop.s_water * arid)
    
    def co2_response(self, co2: float) -> float:
        """CO2 响应函数"""
        if co2 >= 700:
            return 1 + self.crop.co2_rue * 350 / 100
        else:
            return max((self.crop.co2_rue * co2 * 0.01 + 1 - 0.01 * 350 * self.crop.co2_rue), 1)
    
    # ===== 水分平衡 =====
    
    def calculate_et0(self, srad: float, tmax: float, tmin: float) -> float:
        """计算参考蒸散量 (Priestley-Taylor)"""
        td = 0.6 * tmax + 0.4 * tmin
        albedo = 0.23
        slang = srad * 23.923
        eeq = slang * (2.04e-4 - 1.83e-4 * albedo) * (td + 29.0)
        
        pt = eeq * 1.1
        if tmax > 35:
            pt = eeq * ((tmax - 35.0) * 0.05 + 1.1)
        elif tmax < 5.0:
            pt = eeq * 0.01 * np.exp(0.18 * (tmax + 20))
        
        return max(pt, 0.0001)
    
    def calculate_arid(self, weather: List[WeatherData]) -> List[float]:
        """计算干旱指数序列"""
        n_days = len(weather)
        arid_list = []
        wat = 0  # 初始土壤含水量
        rcn = self.soil.rcn
        rzd = self.soil.rzd
        awc = self.soil.awc
        ddc = self.soil.ddc
        wuc = self.soil.wuc
        
        for i in range(n_days):
            w = weather[i]
            
            # 计算 ET0
            eto = self.calculate_et0(w.radiation, w.tmax, w.tmin)
            
            # 计算径流
            if w.rain > 0.2 * (25400 / rcn - 254):
                ro = (w.rain - 0.2 * (25400 / rcn - 254)) ** 2 / (w.rain + 0.8 * (25400 / rcn - 254))
            else:
                ro = 0
            
            # 水分平衡
            cwbd = w.rain - ro
            wbd = cwbd + wat
            
            # 排水
            if wbd / rzd > awc:
                dr = rzd * ddc * (wbd / rzd - awc)
            else:
                dr = 0
            
            wad = wbd - dr
            tr = min(wuc * rzd * wad / rzd, eto)
            wat = wad - tr
            
            # 干旱指数
            arid = 1 - tr / eto if eto > 0 else 0
            arid_list.append(arid)
        
        return arid_list
    
    # ===== 生物量计算 =====
    
    def calculate_daily_biomass(self, f_solar: float, srad: float, 
                                 f_co2: float, f_temp: float, 
                                 f_water: float, f_heat: float) -> float:
        """计算每日生物量增量"""
        return 10 * self.crop.rue * f_solar * srad * f_co2 * f_temp * min(f_water, f_heat)
    
    # ===== 光截获动态 =====
    
    def calculate_f_solar(self, tt: float, i50a: float, i50b: float, 
                          f_solar_water: float) -> float:
        """计算光截获率 (双 logistic 曲线)"""
        f_solar1 = min(1, self.crop.fsolar_max / (1 + np.exp(-0.01 * (tt - i50a))))
        f_solar2 = min(1, self.crop.fsolar_max / (1 + np.exp(0.01 * (tt - (self.crop.tsum - i50b)))))
        return min(f_solar1, f_solar2) * min(f_solar_water, 1)
    
    # ===== 主模拟函数 =====
    
    def simulate(self, weather: List[WeatherData], 
                 management: ManagementParams) -> List[DailyResult]:
        """运行作物生长模拟"""
        
        # 计算干旱指数
        arid_list = self.calculate_arid(weather)
        
        # 初始化结果
        results = []
        biomass = management.init_bio
        tt_cum = management.init_tt
        i50a = self.crop.i50a
        i50b = self.crop.i50b
        maturity_day = len(weather)
        
        # CO2 响应
        f_co2 = self.co2_response(management.co2)
        
        for day in range(len(weather)):
            w = weather[day]
            tmean = (w.tmax + w.tmin) / 2
            
            # 环境响应
            f_temp = self.temperature_response(tmean)
            f_heat = self.heat_response(w.tmax)
            f_water = self.water_response(arid_list[day]) if not management.irrigation else 1.0
            
            # 积温
            dtt = max(tmean - self.crop.tbase, 0)
            tt_cum += dtt
            
            # 光截获
            f_solar_water = 1.0 if f_water > 0.1 else f_water + 0.9
            f_solar = self.calculate_f_solar(tt_cum, i50a, i50b, f_solar_water)
            
            # 生物量增量
            if day > 0:
                dbio = self.calculate_daily_biomass(f_solar, w.radiation, f_co2, f_temp, f_water, f_heat)
                biomass += dbio
            
            # I50B 动态调整
            i50b = max(0, i50b + max(
                self.crop.i50max_w * (1 - f_water),
                self.crop.i50max_h * (1 - f_heat)
            ))
            
            # 产量计算
            yield_val = biomass * self.crop.hi
            
            # 记录结果
            results.append(DailyResult(
                day=day + 1,
                date=w.date,
                tmean=tmean,
                radiation=w.radiation,
                tt=tt_cum,
                biomass=biomass,
                yield_val=yield_val,
                f_solar=f_solar,
                f_temp=f_temp,
                f_water=f_water,
                f_heat=f_heat,
                f_co2=f_co2,
                arid=arid_list[day]
            ))
            
            # 检查成熟
            if tt_cum >= self.crop.tsum:
                maturity_day = day + 1
                break
            
            # 检查早衰
            if day > 0 and f_solar < results[day-1].f_solar and f_solar <= 0.005:
                maturity_day = day + 1
                break
        
        return results[:maturity_day]


# ===== 便捷函数 =====

def create_wheat_model() -> CropSim:
    """创建冬小麦模型"""
    crop_params = CropParams(
        tbase=0, topt=25, rue=2.5,
        max_t=35, extreme_t=45,
        s_water=0.5, co2_rue=0.3,
        tsum=2500, hi=0.45,
        i50a=500, i50b=200
    )
    soil_params = SoilParams()
    return CropSim(crop_params, soil_params)


def create_rice_model() -> CropSim:
    """创建水稻模型"""
    crop_params = CropParams(
        tbase=10, topt=30, rue=2.0,
        max_t=38, extreme_t=45,
        s_water=0.3, co2_rue=0.25,
        tsum=2300, hi=0.50,
        i50a=850, i50b=200
    )
    soil_params = SoilParams(awc=0.15, rzd=300)
    return CropSim(crop_params, soil_params)


def create_maize_model() -> CropSim:
    """创建玉米模型"""
    crop_params = CropParams(
        tbase=8, topt=30, rue=3.0,
        max_t=35, extreme_t=42,
        s_water=0.6, co2_rue=0.2,
        tsum=2050, hi=0.50,
        i50a=500, i50b=50
    )
    soil_params = SoilParams(awc=0.12, rzd=600)
    return CropSim(crop_params, soil_params)

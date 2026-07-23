"""
CropSim v2 - 加入春化机制的作物生长模拟模型
基于 WOFOST 参数体系
数据来源: https://github.com/ajwdewit/WOFOST_crop_parameters

Author: Mayuanyuan
Date: 2026-05-30
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import math


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
    daylength: float = 12.0  # 日长 (小时)


@dataclass
class SoilParams:
    """土壤参数 (来源: WOFOST 默认值)"""
    smax: float = 0.45  # 饱和含水量 (cm³/cm³)
    sfc: float = 0.32  # 田间持水量 (cm³/cm³)
    swp: float = 0.15  # 凋萎点 (cm³/cm³)
    kdif: float = 0.10  # 排水系数 (day⁻¹)
    rzd: float = 100  # 根区深度 (cm)
    sm: float = 250  # 最大土壤含水量 (mm)


@dataclass
class VernalizationParams:
    """春化参数 (来源: WOFOST wheat.yaml)"""
    vernsat: float = 70.0  # 饱和春化需求 (天)
    vernbase: float = 14.0  # 基础春化需求 (天)
    verndvs: float = 0.30  # 春化截止发育阶段
    vernrtb: List[List[float]] = field(default_factory=lambda: [
        [-8.0, 0.0],
        [-4.0, 0.0],
        [3.0, 1.0],
        [10.0, 1.0],
        [17.0, 0.0],
        [20.0, 0.0]
    ])


@dataclass
class CropParams:
    """作物参数 (来源: WOFOST wheat.yaml)"""
    # 发育阶段参数
    idsl: int = 2
    tsumem: float = 120  # 播种到出苗积温 (°C·d)
    tsum1: float = 1000  # 出苗到开花积温 (°C·d)
    tsum2: float = 950  # 开花到成熟积温 (°C·d)
    
    # 温度参数
    tbasem: float = 0.0
    teffmx: float = 30.0
    
    # 日长参数
    dlo: float = 14.0  # 最适日长 (小时)
    dlc: float = 8.0  # 临界日长 (小时)
    
    # 初始条件
    tdwi: float = 50.0  # 初始生物量 (kg/ha)
    
    # 生长参数
    rgrlai: float = 0.0082  # 最大叶面积指数增长率 (d⁻¹)
    sla: float = 0.00212  # 比叶面积 (ha/kg)
    span: float = 31.3  # 叶片寿命 (天)
    tbase: float = 0.0  # 叶片老化下限温度 (°C)
    
    # 光合作用参数 (C3作物)
    amax: float = 45.0  # 最大同化速率 (kg CO2/ha/h)
    eff: float = 0.45  # 光能利用效率 (kg CO2/J/ha/h)
    
    # 同化物分配参数
    fltb: List[List[float]] = field(default_factory=lambda: [
        [0.0, 0.65], [1.0, 0.65], [1.2, 0.50], [2.0, 0.50]
    ])  # 叶片分配系数
    fstb: List[List[float]] = field(default_factory=lambda: [
        [0.0, 0.35], [1.0, 0.35], [1.2, 0.20], [2.0, 0.20]
    ])  # 茎秆分配系数
    fotb: List[List[float]] = field(default_factory=lambda: [
        [0.0, 0.0], [1.0, 0.0], [1.2, 0.30], [2.0, 0.30]
    ])  # 器官分配系数
    
    # 收获指数
    hi: float = 0.45
    
    # 春化参数
    vernalization: VernalizationParams = field(default_factory=VernalizationParams)
    
    # CO2 参数
    co2amxtb: List[List[float]] = field(default_factory=lambda: [
        [40, 0.0], [360, 1.0], [720, 1.6], [1000, 1.9], [2000, 1.9]
    ])
    co2efftb: List[List[float]] = field(default_factory=lambda: [
        [40, 0.0], [360, 1.0], [720, 1.11], [1000, 1.11], [2000, 1.11]
    ])


@dataclass
class ManagementParams:
    """管理参数"""
    sowing_date: str  # 播种日期 (YYYY-MM-DD)
    co2: float = 400  # CO2 浓度 (ppm)
    irrigation: bool = False  # 是否灌溉


@dataclass
class DailyResult:
    """每日模拟结果"""
    day: int
    date: str
    dvs: float  # 发育阶段
    tmean: float
    radiation: float
    biomass: float  # 生物量
    lai: float  # 叶面积指数
    yield_val: float  # 产量
    vern: float  # 春化状态
    is_vernalised: bool  # 是否完成春化
    f_v: float  # 春化因子
    f_t: float  # 温度因子
    f_w: float  # 水分因子


class CropSim:
    """作物生长模拟模型 (WOFOST 体系)"""
    
    def __init__(self, crop_params: CropParams, soil_params: SoilParams):
        self.crop = crop_params
        self.soil = soil_params
    
    def interp_table(self, table: List[List[float]], x: float) -> float:
        """线性插值函数"""
        if x <= table[0][0]:
            return table[0][1]
        if x >= table[-1][0]:
            return table[-1][1]
        
        for i in range(len(table) - 1):
            if table[i][0] <= x <= table[i+1][0]:
                frac = (x - table[i][0]) / (table[i+1][0] - table[i][0])
                return table[i][1] + frac * (table[i+1][1] - table[i][1])
        
        return table[-1][1]
    
    def calculate_dtsm(self, tavg: float) -> float:
        """计算每日有效温度"""
        dtsmtb = [[0.0, 0.0], [30.0, 30.0], [45.0, 30.0]]
        return self.interp_table(dtsmtb, tavg)
    
    def calculate_vernalization(self, tavg: float, dvs: float, vern_prev: float) -> tuple:
        """计算春化状态"""
        vernp = self.crop.vernalization
        
        if dvs >= vernp.verndvs:
            return vern_prev, True, 1.0
        
        vernr = self.interp_table(vernp.vernrtb, tavg)
        vernr = max(0.0, vernr)
        vern = vern_prev + vernr
        
        if vern >= vernp.vernsat:
            f_v = 1.0
            is_vernalised = True
        elif vern <= vernp.vernbase:
            f_v = 0.0
            is_vernalised = False
        else:
            f_v = (vern - vernp.vernbase) / (vernp.vernsat - vernp.vernbase)
            is_vernalised = False
        
        return vern, is_vernalised, f_v
    
    def calculate_development_rate(self, tavg: float, daylength: float, 
                                    f_v: float, dvs: float) -> float:
        """计算发育速率"""
        dtsm = self.calculate_dtsm(tavg)
        
        if self.crop.idsl == 0:
            if dvs < 1.0:
                return dtsm / self.crop.tsum1
            else:
                return dtsm / self.crop.tsum2
        
        elif self.crop.idsl == 1:
            if dvs < 1.0:
                dlp = max(0, daylength - self.crop.dlc) / (self.crop.dlo - self.crop.dlc)
                dlp = min(1.0, dlp)
                return dtsm * dlp / self.crop.tsum1
            else:
                return dtsm / self.crop.tsum2
        
        else:  # idsl == 2
            if dvs < 1.0:
                dlp = max(0, daylength - self.crop.dlc) / (self.crop.dlo - self.crop.dlc)
                dlp = min(1.0, dlp)
                return dtsm * dlp * f_v / self.crop.tsum1
            else:
                return dtsm / self.crop.tsum2
    
    def calculate_assimilation(self, lai: float, srad: float, tavg: float, 
                               co2: float) -> float:
        """
        计算总同化量
        返回: kg CH2O/ha/d
        """
        co2_amax = self.interp_table(self.crop.co2amxtb, co2)
        co2_eff = self.interp_table(self.crop.co2efftb, co2)
        
        amax = self.crop.amax * co2_amax  # kg CO2/ha/h
        eff = self.crop.eff * co2_eff  # kg CO2/J/ha/h
        
        # 光截获 (Beer-Lambert)
        k = 0.75
        par = srad * 0.5 * 1e6  # J/m²
        aparmax = par * (1 - np.exp(-k * lai)) / 10000  # J/ha
        
        # 同化速率
        if aparmax > 0:
            a = amax * eff * aparmax / (eff * aparmax + amax)
        else:
            a = 0
        
        # 温度修正
        if tavg < 5:
            a *= 0.3
        elif tavg > 35:
            a *= 0.5
        
        # 转换为每日同化量
        a_daily = a * 8 * 30 / 44  # CO2 -> CH2O
        
        return max(0, a_daily)
    
    def calculate_water_stress(self, soil_water: float) -> float:
        """计算水分胁迫因子"""
        swc = (soil_water - self.soil.swp) / (self.soil.sfc - self.soil.swp)
        swc = max(0, min(1, swc))
        
        if swc > 0.5:
            return 1.0
        else:
            return swc * 2
    
    def simulate(self, weather: List[WeatherData], 
                 management: ManagementParams) -> List[DailyResult]:
        """
        运行作物生长模拟
        """
        
        # 初始化状态变量
        dvs = 0.0
        biomass = self.crop.tdwi  # 50 kg/ha
        lai = 0.5  # 初始 LAI
        vern = 0.0
        is_vernalised = False
        soil_water = self.soil.sfc * self.soil.rzd * 10
        
        results = []
        maturity_day = len(weather)
        
        # 同化物转换效率
        cvl = 0.72  # 叶片
        cvs = 0.70  # 茎秆
        cvo = 0.75  # 器官
        
        for day in range(len(weather)):
            w = weather[day]
            tavg = (w.tmax + w.tmin) / 2
            
            # ===== 1. 春化 =====
            vern, is_vernalised, f_v = self.calculate_vernalization(tavg, dvs, vern)
            
            # ===== 2. 发育速率 =====
            dvr = self.calculate_development_rate(tavg, w.daylength, f_v, dvs)
            
            # ===== 3. 同化量 =====
            assim = self.calculate_assimilation(lai, w.radiation, tavg, management.co2)
            
            # ===== 4. 呼吸消耗 =====
            growth_resp = assim * 0.30
            maintenance_resp = biomass * 0.015
            
            # ===== 5. 生物量增量 =====
            fl = self.interp_table(self.crop.fltb, dvs)
            fs = self.interp_table(self.crop.fstb, dvs)
            fo = self.interp_table(self.crop.fotb, dvs)
            
            growth_assim = max(0, assim - growth_resp - maintenance_resp)
            
            dbio_leaf = growth_assim * fl * cvl
            dbio_stem = growth_assim * fs * cvs
            dbio_org = growth_assim * fo * cvo
            
            dbio = dbio_leaf + dbio_stem + dbio_org
            biomass += dbio
            
            # ===== 6. LAI 计算 =====
            # 叶片生长: LAI = 叶生物量 × SLA
            # SLA 单位: ha/kg, 所以 LAI = kg/ha × ha/kg = 无量纲
            if dbio_leaf > 0:
                d_lai = dbio_leaf * self.crop.sla
            else:
                d_lai = 0
            
            # 叶片衰老
            # 衰老速率与温度和发育阶段相关
            temp_factor = max(0, tavg - self.crop.tbase) / 25  # 温度因子
            dvs_factor = min(1.0, dvs / 1.5) if dvs > 1.0 else 0.5  # 开花后加速衰老
            
            d_lai_sen = lai * (1 / self.crop.span) * temp_factor * dvs_factor
            
            lai += d_lai - d_lai_sen
            lai = max(0.1, lai)
            
            # ===== 7. 更新发育阶段 =====
            dvs += dvr
            
            # ===== 8. 计算产量 =====
            yield_val = biomass * self.crop.hi if dvs >= 1.0 else 0
            
            # ===== 9. 水分平衡 =====
            et = 5.0
            soil_water += w.rain - et
            soil_water = max(self.soil.swp * self.soil.rzd * 10, 
                           min(self.soil.smax * self.soil.rzd * 10, soil_water))
            
            f_w = self.calculate_water_stress(soil_water / (self.soil.rzd * 10))
            
            # ===== 记录结果 =====
            results.append(DailyResult(
                day=day + 1,
                date=w.date,
                dvs=dvs,
                tmean=tavg,
                radiation=w.radiation,
                biomass=biomass,
                lai=lai,
                yield_val=yield_val,
                vern=vern,
                is_vernalised=is_vernalised,
                f_v=f_v,
                f_t=self.calculate_dtsm(tavg) / 25,
                f_w=f_w
            ))
            
            # ===== 检查成熟 =====
            if dvs >= 2.0:
                maturity_day = day + 1
                break
        
        return results[:maturity_day]


# ===== 工厂函数 =====

def create_winter_wheat_model() -> CropSim:
    """创建黄淮海冬小麦模型"""
    crop_params = CropParams(
        idsl=2,
        tsumem=120,
        tsum1=1000,
        tsum2=950,
        tbasem=0.0,
        teffmx=30.0,
        dlo=14.0,
        dlc=8.0,
        tdwi=50.0,
        rgrlai=0.0082,
        sla=0.00212,
        span=31.3,
        tbase=0.0,
        amax=45.0,
        eff=0.45,
        hi=0.45,
        vernalization=VernalizationParams(
            vernsat=70.0,
            vernbase=14.0,
            verndvs=0.30
        )
    )
    soil_params = SoilParams()
    return CropSim(crop_params, soil_params)


def create_spring_wheat_model() -> CropSim:
    """创建春小麦模型"""
    crop_params = CropParams(
        idsl=0,
        tsumem=100,
        tsum1=800,
        tsum2=700,
        tbasem=0.0,
        teffmx=30.0,
        dlo=14.0,
        dlc=8.0,
        tdwi=50.0,
        rgrlai=0.0082,
        sla=0.00212,
        span=31.3,
        tbase=0.0,
        amax=45.0,
        eff=0.45,
        hi=0.42
    )
    soil_params = SoilParams()
    return CropSim(crop_params, soil_params)

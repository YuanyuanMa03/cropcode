#!/usr/bin/env python3
"""CropMath calculator CLI — self-contained, no external dependencies.

Usage:
    python calc.py <formula_id> param1=value1 param2=value2 ...

Example:
    python calc.py RG_FPAR k=0.5 LAI=3.0
    python calc.py CH4_TI Q10=2.5 t_soil=28
"""
from __future__ import annotations

import math
import sys

# ---------------------------------------------------------------------------
# RiceGrow calculators
# ---------------------------------------------------------------------------

def _rg_fpar(p): return 1 - math.exp(-p["k"] * p["LAI"])
def _rg_rint(p): return p["PAR"] * (1 - math.exp(-p["k"] * p["LAI"]))
def _rg_ftmp(p):
    t, tb, tol, tou, tmax = p["T"], p["Tb"], p["Tol"], p["Tou"], p["Tmax"]
    if tb <= t < tol: return math.sin(((t - tb) / (tol - tb)) * math.pi / 2)
    if tol <= t < tou: return 1.0
    if tou <= t < tmax: return math.cos(((t - tou) / (tmax - tou)) * math.pi / 2)
    return 0.0
def _rg_hi(p): return p["Y_grain"] / p["B_above"]
def _rg_pip(p):
    hi = p["Y_grain"] / p["B_above"]
    ppip = hi / 0.87
    if p["PDT"] < 24: return 0.0
    return ppip / (1 + math.exp(-0.2804 * (p["PDT"] - 39)))
def _rg_fco2(p): return 1 + p["beta"] * math.log(p["Cx"] / 340)
def _rg_fpa(p):
    if p["PDT"] < 28: return 1.0
    return math.exp(-p["a"] * (p["PDT"] - 28))
def _rg_rmto(p): return 0.0091 - 0.0001 * p["PDT"]
def _rg_rm(p):
    rmto = 0.0091 - 0.0001 * p["PDT"]
    return rmto * p["ABIOMASS"] * (p["Q10"] ** ((p["T"] - p["To"]) / 10))
def _rg_sla(p):
    if p["GDD"] <= 1200: return (-0.0002 * p["GDD"] ** 2 - 0.5604 * p["GDD"] + 581.04) * (p["SLAc"] / 200)
    return p["SLAc"]
def _rg_pish(p): return -8.42e-5 * p["PDT"] ** 2 + 0.01 * p["PDT"] + 0.63
def _rg_pigl(p):
    if p["PDT"] < 26: return 0.54 - 0.0046 * p["PDT"]
    return 1.4532 * math.exp(-0.0492 * p["PDT"])
def _rg_rte_beta(p):
    t, tb, to, tm, ts = p["T"], p["Tb"], p["To"], p["Tm"], p["TS"]
    if not (tb <= t <= tm): return 0.0
    b = (tm - to) / (to - tb)
    a = ((t - tb) / (to - tb)) * (((tm - t) / (tm - to)) ** b)
    return a ** ts
def _rg_pc(p): return p["Po"] + math.sqrt(1 / p["PS"])
def _rg_rpe(p):
    pc = p["Po"] + math.sqrt(1 / p["PS"])
    dl = p["P"]
    if dl <= p["Po"]: return 1.0
    if dl <= pc: return 1 - p["PS"] * ((dl - p["Po"]) ** 2)
    return 0.0
def _rg_dpe(p):
    pdt = p["PDT"]
    if pdt < 8: return p["DTE"] * p["IE"]
    if pdt < 18: return p["DTE"] * p["RPE"]
    if pdt < 32: return p["DTE"]
    if pdt < 57: return p["DTE"] * p["BFF"]
    return 0.0
def _rg_emgdd(p): return 45 + 7 * p["SDEPTH"]
def _rg_laip_exp(p): return p["LAI0"] * math.exp(p["RP"] * p["GDD"])
def _rg_r_lai_stress(p): return p["RP"] * min(p["NNI"], p["WDF"])
def _rg_lai_sla(p): return p["SLA"] * p["AWL"]
def _rg_k_pdt(p): return 0.0087 * p["PDT"] + 0.2222
def _rg_amax(p): return p["Am"] * p["FCO2"] * p["FPA"] * p["FT"] * min(p["NNI"], p["WDF"])
def _rg_rg(p): return p["Rg"] * p["DTGA"]
def _rg_gcr(p): return (p["DTGA"] - p["RM"] - p["RG"]) / (1 - p["b"])
def _rg_piro(p): return 1 - (-8.42e-5 * p["PDT"] ** 2 + 0.01 * p["PDT"] + 0.63)
def _rg_stem_pi(p):
    pdt = p["PDT"]
    pigl = 0.54 - 0.0046 * pdt if pdt < 26 else 1.4532 * math.exp(-0.0492 * pdt)
    hi = p["Y_grain"] / p["B_above"]
    ppip = hi / 0.87
    pip = 0.0 if pdt < 24 else ppip / (1 + math.exp(-0.2804 * (pdt - 39)))
    return 1 - pigl - pip
def _rg_htf(p):
    if 32 <= p["PDT"] <= 39 and p["Tmax_day"] > 36.6:
        return 1 / (1 + math.exp(0.853 * (p["Tmax_day"] - 36.6)))
    return 1.0
def _rg_ltf(p):
    if 26 <= p["PDT"] <= 39 and p["Tmean"] < 22:
        return 1 - (4.6 + 0.054 * (p["Qt"] ** 1.56)) / 100
    return 1.0
def _rg_yield_dry(p): return p["AWSP"] * p["grain_fraction"]

# ---------------------------------------------------------------------------
# CH4MOD calculators
# ---------------------------------------------------------------------------

def _ch4_tsoil(p): return 4.4 + 0.76 * p["Tair"]
def _ch4_ti(p):
    t_sl = 30 if p["t_soil"] >= 30 else p["t_soil"]
    return p["Q10"] ** ((t_sl - 30) / 10)
def _ch4_feh(p):
    if p["Eh"] < -150: return 1.0
    return math.exp(-1.7 * (1 + p["Eh"] / 150))
def _ch4_cr(p): return 0.0018 * p["VI"] * p["SI"] * (p["W"] ** 1.25)
def _ch4_wi(p): return 0.49 * math.exp(3.88 * p["WaterC"] - 5.4 * (p["WaterC"] ** 2))
def _ch4_omnc(p): return p["WI"] * p["SI"] * p["TI"] * 0.027 * p["OMN"]
def _ch4_omsc(p): return p["WI"] * p["SI"] * p["TI"] * 0.003 * p["OMS"]
def _ch4_prod(p): return max(0.0, 0.27 * p["FEh"] * (p["TI"] * p["Cr"] + p["Com"]))
def _ch4_ebl(p):
    if p["Wr"] <= 0: return 0.7 * p["P"]
    if p["t_soil"] <= 0: return 0.0
    return min(0.7 * math.log(p["t_soil"]) / p["Wr"], 0.9) * p["P"]
def _ch4_fp(p): return p["CH4RiceEfC"] * ((1 - p["W"] / p["Wmax"]) ** 0.25)
def _ch4_total(p):
    fp = p["CH4RiceEfC"] * ((1 - p["W"] / p["Wmax"]) ** 0.25)
    ep = p["P"] * fp
    return p["Ebl"] + ep

# ---------------------------------------------------------------------------
# AgroC calculators
# ---------------------------------------------------------------------------

def _ag_co2_fert(p): return 1 + p["Coef_B_CO2"] * math.log(p["CO2"] / 340)
def _ag_temp_crop(p):
    td, tmin, topt, tmax, m = p["Td"], p["Tmin_active"], p["Topt_active"], p["Tmax_active"], p["Coef_T_M"]
    if td > tmax or td < tmin: return 0.0
    return ((td - tmin) / (topt - tmin)) ** (1 + m) * ((tmax - td) / (tmax - topt)) ** (1 - m)
def _ag_water_crop(p):
    sw, cmax, cmin, wilt = p["Soil_Water"], p["Crop_Water_max"], p["Crop_Water_min"], p["Wilt_point"]
    if sw <= wilt: return 0.0
    if sw < cmin: return (sw - wilt) / (cmin - wilt)
    if sw < cmax: return 1.0
    return 0.5 * (1 + (1 - sw) / (1 - cmax))
def _ag_par(p):
    radi_mol = p["Radi"] * 0.44 * 4.6
    return radi_mol * (1 - p["Coef_rou"]) * (1 - math.exp(-p["Coef_K"] * p["LAI"])) / (p["Coef_K"] * p["LAI"])
def _ag_photo_opt(p):
    photo_rate_max = p["Coef_alfa"] * p["Leaf_N"]
    return photo_rate_max * p["PAR"] / (p["PAR"] + p["Coef_beta"])
def _ag_gpp(p): return p["Photo_Rate_opt"] * p["F_T"] * p["F_Water"] * p["F_CO2"] * p["Day_Length_hour"] * 0.0432
def _ag_plant_rm(p):
    rm = 0.0432 * 24 * (p["Biom_plant_yesterday"] / 0.45) * p["Coef_Rm"] * (2.0 ** ((p["Tmn"] - 25) / 10))
    if p["DVI"] > 1: rm = rm / (p["DVI"] ** 2)
    return rm
def _ag_n_demand(p):
    if p["NPP"] < 0: return 0.0
    if p["N_shoot"] < 3.5 and p["DVI"] < 0.3: return p["Coef_Plant_TN_uptake"] * p["N_shoot"]
    return min(p["N_requirement_max_day"], p["Ratio_N_C_photo_product"] * p["NPP"])
def _ag_n_shoot(p): return p["Plant_TN_uptake"] * p["Biom_shoot"] / (p["Biom_shoot"] + p["Biom_root"])
def _ag_soil_temp(p):
    tsoil = p["Temp"] if p["is_soil_temp"] >= 0.5 else 4.4 + 0.76 * p["Temp"]
    return 2.4 ** ((tsoil - 10) * 0.1)
def _ag_soil_water(p):
    soil_water_weight = p["Soil_Water"] / p["BD"]
    if p["Soil_Water"] >= p["Saturate_Water"]: return 0.65
    return 0.49 * math.exp(3.88 * soil_water_weight - 5.4 * soil_water_weight * soil_water_weight)
def _ag_soil_ph(p): return 1 / (1 + math.exp(2.5 * (5 - p["pH"])))
def _ag_pool_decomp(p):
    pool_decom = p["Pool"] * p["Coef_K_Decom"] * p["F_temp"] * p["F_water"] * p["F_texture"] * p["F_pH"] * p["F_notill"]
    return max(0.0, pool_decom - pool_decom * p["Coef_K_Trans"])
def _ag_nue(p): return p["GrainYield"] / p["NUptake"]

# ---------------------------------------------------------------------------
# SIMPLE calculators
# ---------------------------------------------------------------------------

def _simple_dtt(p): return max(p["Tmean"] - p["Tbase"], 0.0)
def _simple_ftemp(p):
    if p["Tmean"] >= p["Topt"]: return 1.0
    return max((p["Tmean"] - p["Tbase"]) / (p["Topt"] - p["Tbase"]), 0.0)
def _simple_fco2(p):
    if p["CO2"] >= 700: return 1 + p["CO2_RUE"] * 350 / 100
    return max((p["CO2_RUE"] * p["CO2"] * 0.01 + 1 - 0.01 * 350 * p["CO2_RUE"]), 1)
def _simple_fwater(p): return max(0.0, 1 - p["S_Water"] * p["ARID"])
def _simple_fheat(p):
    if p["Tmax"] <= p["MaxT"]: return 1.0
    if p["Tmax"] > p["ExtremeT"]: return 0.0
    return max(1 - (p["Tmax"] - p["MaxT"]) / (p["ExtremeT"] - p["MaxT"]), 0.0)
def _simple_fsolar(p):
    f1 = min(1.0, p["fSolarMax"] / (1 + math.exp(-0.01 * (p["TT"] - p["I50A"]))))
    f2 = min(1.0, p["fSolarMax"] / (1 + math.exp(0.01 * (p["TT"] - (p["Tsum"] - p["I50B"])))))
    return min(f1, f2) * min(p["fSolar_water"], 1.0)
def _simple_biomass(p):
    return 10 * p["RUE"] * p["fSolar"] * p["SRAD"] * p["F_CO2"] * p["F_Temp"] * min(p["F_Water"], p["F_Heat"])
def _simple_yield(p): return p["Biomass"] * p["HI"]

# ---------------------------------------------------------------------------
# Formula registry (id → metadata + calculator)
# ---------------------------------------------------------------------------

_FORMULAS = {
    "RG_FPAR":       {"name": "光能截获率",           "en": "Light interception fraction",               "expr": "1 - exp(-k * LAI)",                                             "unit": "fraction",          "prec": 2, "params": ["k", "LAI"],                                                     "calc": _rg_fpar},
    "RG_RINT":       {"name": "截获光合有效辐射",      "en": "Intercepted PAR",                            "expr": "PAR * (1 - exp(-k * LAI))",                                    "unit": "MJ/m2/day",         "prec": 2, "params": ["PAR", "k", "LAI"],                                               "calc": _rg_rint},
    "RG_FTMP":       {"name": "温度响应因子",          "en": "Temperature response factor",                "expr": "piecewise sin/cos",                                             "unit": "fraction",          "prec": 2, "params": ["T", "Tb", "Tol", "Tou", "Tmax"],                                "calc": _rg_ftmp},
    "RG_HI":         {"name": "收获指数",             "en": "Harvest index",                              "expr": "Y_grain / B_above",                                            "unit": "fraction",          "prec": 2, "params": ["Y_grain", "B_above"],                                            "calc": _rg_hi},
    "RG_PIP":        {"name": "穗分配指数",           "en": "Panicle partitioning index",                 "expr": "(HI/0.87)/(1+exp(-0.2804*(PDT-39)))",                          "unit": "fraction",          "prec": 2, "params": ["Y_grain", "B_above", "PDT"],                                    "calc": _rg_pip},
    "RG_FCO2":       {"name": "二氧化碳影响因子",      "en": "CO2 response factor",                        "expr": "1 + beta * ln(Cx / 340)",                                      "unit": "multiplier",        "prec": 2, "params": ["Cx", "beta"],                                                   "calc": _rg_fco2},
    "RG_FPA":        {"name": "生理年龄因子",          "en": "Physiological age factor",                   "expr": "if PDT<28: 1; else: exp(-a*(PDT-28))",                         "unit": "fraction",          "prec": 2, "params": ["PDT", "a"],                                                     "calc": _rg_fpa},
    "RG_RMTO":       {"name": "最适温度维持呼吸系数",   "en": "Maintenance respiration coeff at Topt",      "expr": "0.0091 - 0.0001 * PDT",                                        "unit": "d-1",               "prec": 4, "params": ["PDT"],                                                          "calc": _rg_rmto},
    "RG_RM":         {"name": "维持呼吸",             "en": "Maintenance respiration",                    "expr": "RMTO * ABIOMASS * Q10^((T-To)/10)",                            "unit": "kg/ha/day",         "prec": 2, "params": ["PDT", "ABIOMASS", "Q10", "T", "To"],                            "calc": _rg_rm},
    "RG_SLA":        {"name": "比叶面积",             "en": "Specific leaf area",                         "expr": "piecewise quadratic in GDD",                                   "unit": "cm2/g",             "prec": 2, "params": ["GDD", "SLAc"],                                                  "calc": _rg_sla},
    "RG_PISH":       {"name": "地上部分配指数",        "en": "Shoot partitioning index",                   "expr": "-8.42e-5*PDT^2+0.01*PDT+0.63",                                 "unit": "fraction",          "prec": 2, "params": ["PDT"],                                                          "calc": _rg_pish},
    "RG_PIGL":       {"name": "绿叶分配指数",          "en": "Green leaf partitioning index",              "expr": "piecewise linear/exp by PDT",                                  "unit": "fraction",          "prec": 2, "params": ["PDT"],                                                          "calc": _rg_pigl},
    "RG_RTE_BETA":   {"name": "相对热效应",           "en": "Relative thermal effectiveness",             "expr": "beta temperature response",                                    "unit": "fraction",          "prec": 3, "params": ["T", "Tb", "To", "Tm", "TS"],                                    "calc": _rg_rte_beta},
    "RG_PC":         {"name": "临界日长",             "en": "Critical daylength",                         "expr": "Po + sqrt(1 / PS)",                                            "unit": "h",                 "prec": 2, "params": ["Po", "PS"],                                                     "calc": _rg_pc},
    "RG_RPE":        {"name": "相对光周期效应",        "en": "Relative photoperiod effectiveness",         "expr": "piecewise quadratic in P-Po",                                  "unit": "fraction",          "prec": 2, "params": ["P", "Po", "PS"],                                                "calc": _rg_rpe},
    "RG_DPE":        {"name": "每日生理效应",          "en": "Daily physiological effectiveness",          "expr": "stage-dependent product",                                      "unit": "phys days/day",     "prec": 3, "params": ["PDT", "DTE", "IE", "RPE", "BFF"],                               "calc": _rg_dpe},
    "RG_EMGDD":      {"name": "出苗热量需求",          "en": "Emergence thermal requirement",              "expr": "45 + 7 * SDEPTH",                                              "unit": "C day",             "prec": 1, "params": ["SDEPTH"],                                                       "calc": _rg_emgdd},
    "RG_LAIP_EXP":   {"name": "潜在叶面积指数",        "en": "Potential LAI",                              "expr": "LAI0 * exp(RP * GDD)",                                         "unit": "m2/m2",             "prec": 2, "params": ["LAI0", "RP", "GDD"],                                            "calc": _rg_laip_exp},
    "RG_R_LAI_STRESS":{"name": "实际叶面积相对增长率",  "en": "Actual LAI relative growth rate",            "expr": "RP * min(NNI, WDF)",                                           "unit": "d-1",               "prec": 4, "params": ["RP", "NNI", "WDF"],                                             "calc": _rg_r_lai_stress},
    "RG_LAI_SLA":    {"name": "比叶面积法LAI",         "en": "LAI from SLA",                               "expr": "SLA * AWL",                                                    "unit": "m2/m2",             "prec": 2, "params": ["SLA", "AWL"],                                                   "calc": _rg_lai_sla},
    "RG_K_PDT":      {"name": "冠层消光系数",          "en": "Canopy extinction coefficient",              "expr": "0.0087 * PDT + 0.2222",                                        "unit": "dimensionless",     "prec": 3, "params": ["PDT"],                                                          "calc": _rg_k_pdt},
    "RG_AMAX":       {"name": "实际最大同化速率",       "en": "Actual max assimilation rate",               "expr": "Am*FCO2*FPA*FT*min(NNI,WDF)",                                  "unit": "kg CO2/ha/h",      "prec": 2, "params": ["Am", "FCO2", "FPA", "FT", "NNI", "WDF"],                       "calc": _rg_amax},
    "RG_RG":         {"name": "生长呼吸",             "en": "Growth respiration",                         "expr": "Rg * DTGA",                                                    "unit": "kg/ha/day",         "prec": 2, "params": ["Rg", "DTGA"],                                                   "calc": _rg_rg},
    "RG_GCR":        {"name": "日干物质增量",          "en": "Daily dry matter increment",                 "expr": "(DTGA-RM-RG)/(1-b)",                                           "unit": "kg/ha/day",         "prec": 2, "params": ["DTGA", "RM", "RG", "b"],                                        "calc": _rg_gcr},
    "RG_PIRO":       {"name": "地下部分配指数",        "en": "Root partitioning index",                    "expr": "1 - PISH",                                                     "unit": "fraction",          "prec": 2, "params": ["PDT"],                                                          "calc": _rg_piro},
    "RG_PIS_STEM":   {"name": "茎鞘分配指数",          "en": "Stem partitioning index",                    "expr": "1 - PIGL - PIP",                                               "unit": "fraction",          "prec": 2, "params": ["PDT", "Y_grain", "B_above"],                                    "calc": _rg_stem_pi},
    "RG_HTF":        {"name": "高温结实因子",          "en": "High-temperature fertility factor",          "expr": "logistic if PDT∈[32,39]",                                      "unit": "fraction",          "prec": 2, "params": ["PDT", "Tmax_day"],                                              "calc": _rg_htf},
    "RG_LTF":        {"name": "低温结实因子",          "en": "Low-temperature fertility factor",           "expr": "power penalty if PDT∈[26,39]",                                 "unit": "fraction",          "prec": 2, "params": ["PDT", "Tmean", "Qt"],                                           "calc": _rg_ltf},
    "RG_YIELD_DRY":  {"name": "稻谷干重产量",          "en": "Dry grain yield",                            "expr": "AWSP * grain_fraction",                                        "unit": "kg/ha",             "prec": 1, "params": ["AWSP", "grain_fraction"],                                        "calc": _rg_yield_dry},
    "CH4_TSOIL_AIR": {"name": "土壤温度估算",          "en": "Soil temperature from air",                  "expr": "4.4 + 0.76 * Tair",                                            "unit": "C",                 "prec": 2, "params": ["Tair"],                                                         "calc": _ch4_tsoil},
    "CH4_TI":        {"name": "甲烷温度指数",          "en": "Methane temperature index",                  "expr": "Q10^((min(t_soil,30)-30)/10)",                                 "unit": "multiplier",        "prec": 3, "params": ["Q10", "t_soil"],                                                "calc": _ch4_ti},
    "CH4_FEH":       {"name": "氧化还原电位因子",      "en": "Redox potential factor",                     "expr": "if Eh<-150: 1; else: exp(-1.7*(1+Eh/150))",                    "unit": "fraction",          "prec": 3, "params": ["Eh"],                                                           "calc": _ch4_feh},
    "CH4_CR":        {"name": "根系分泌碳底物",        "en": "Root-exudate carbon substrate",              "expr": "0.0018*VI*SI*W^1.25",                                          "unit": "g C/m2/day",        "prec": 3, "params": ["VI", "SI", "W"],                                                "calc": _ch4_cr},
    "CH4_WI":        {"name": "水分分解因子",          "en": "Water-content decomposition factor",         "expr": "0.49*exp(3.88*WaterC-5.4*WaterC^2)",                           "unit": "fraction",          "prec": 3, "params": ["WaterC"],                                                       "calc": _ch4_wi},
    "CH4_OMNC":      {"name": "新鲜有机质碳分解量",     "en": "Fresh organic matter decomposition",         "expr": "WI*SI*TI*0.027*OMN",                                           "unit": "g C/m2/day",        "prec": 3, "params": ["WI", "SI", "TI", "OMN"],                                        "calc": _ch4_omnc},
    "CH4_OMSC":      {"name": "土壤有机质碳分解量",     "en": "Soil organic matter decomposition",          "expr": "WI*SI*TI*0.003*OMS",                                           "unit": "g C/m2/day",        "prec": 3, "params": ["WI", "SI", "TI", "OMS"],                                        "calc": _ch4_omsc},
    "CH4_PROD":      {"name": "甲烷产生量",           "en": "Methane production",                         "expr": "max(0,0.27*FEh*(TI*Cr+Com))",                                  "unit": "g CH4/m2/day",      "prec": 3, "params": ["FEh", "TI", "Cr", "Com"],                                       "calc": _ch4_prod},
    "CH4_EBL":       {"name": "甲烷冒泡排放",          "en": "Methane ebullition emission",                "expr": "min(0.7*ln(t_soil)/Wr,0.9)*P",                                 "unit": "g CH4/m2/day",      "prec": 3, "params": ["P", "t_soil", "Wr"],                                            "calc": _ch4_ebl},
    "CH4_FP":        {"name": "植株传输因子",          "en": "Plant methane transport factor",             "expr": "CH4RiceEfC*(1-W/Wmax)^0.25",                                   "unit": "fraction",          "prec": 3, "params": ["CH4RiceEfC", "W", "Wmax"],                                      "calc": _ch4_fp},
    "CH4_E_TOTAL":   {"name": "甲烷总排放",           "en": "Total methane emission",                     "expr": "Ebl + P*CH4RiceEfC*(1-W/Wmax)^0.25",                           "unit": "g CH4/m2/day",      "prec": 3, "params": ["Ebl", "P", "CH4RiceEfC", "W", "Wmax"],                          "calc": _ch4_total},
    "AG_CO2_FERT":   {"name": "作物二氧化碳施肥因子",   "en": "AgroC CO2 fertilization factor",             "expr": "1+Coef_B_CO2*ln(CO2/340)",                                     "unit": "multiplier",        "prec": 3, "params": ["CO2", "Coef_B_CO2"],                                            "calc": _ag_co2_fert},
    "AG_TEMP_CROP":  {"name": "作物温度活性因子",       "en": "AgroC crop temperature activity factor",     "expr": "beta temperature response",                                    "unit": "response factor",   "prec": 3, "params": ["Td", "Tmin_active", "Topt_active", "Tmax_active", "Coef_T_M"], "calc": _ag_temp_crop},
    "AG_WATER_CROP": {"name": "作物水分胁迫因子",       "en": "AgroC crop water stress factor",             "expr": "piecewise water response",                                     "unit": "fraction",          "prec": 3, "params": ["Soil_Water", "Crop_Water_max", "Crop_Water_min", "Wilt_point"], "calc": _ag_water_crop},
    "AG_PAR":        {"name": "冠层吸收PAR",           "en": "AgroC canopy absorbed PAR",                  "expr": "Radi*0.44*4.6*(1-rou)*(1-exp(-K*LAI))/(K*LAI)",                "unit": "umol/m2/s",         "prec": 2, "params": ["Radi", "LAI", "Coef_rou", "Coef_K"],                           "calc": _ag_par},
    "AG_PHOTO_OPT":  {"name": "最适光合速率",          "en": "AgroC optimal photosynthetic rate",          "expr": "(alfa*Leaf_N)*PAR/(PAR+beta)",                                 "unit": "umol CO2/m2/s",     "prec": 3, "params": ["Coef_alfa", "Coef_beta", "PAR", "Leaf_N"],                      "calc": _ag_photo_opt},
    "AG_GPP":        {"name": "总初级生产力",          "en": "AgroC gross primary production",             "expr": "Photo_Rate_opt*F_T*F_Water*F_CO2*DL*0.0432",                   "unit": "g C/m2/day",        "prec": 3, "params": ["Photo_Rate_opt", "F_T", "F_Water", "F_CO2", "Day_Length_hour"], "calc": _ag_gpp},
    "AG_PLANT_RM":   {"name": "植株维持呼吸",          "en": "AgroC plant maintenance respiration",        "expr": "Q10 with DVI correction",                                      "unit": "g C/m2/day",        "prec": 3, "params": ["Biom_plant_yesterday", "Coef_Rm", "Tmn", "DVI"],               "calc": _ag_plant_rm},
    "AG_N_DEMAND":   {"name": "作物需氮量",           "en": "AgroC crop nitrogen demand",                 "expr": "piecewise minimum by NPP/N_shoot",                             "unit": "g N/m2/day",        "prec": 3, "params": ["N_shoot", "Coef_Plant_TN_uptake", "N_requirement_max_day", "NPP", "Ratio_N_C_photo_product", "DVI"], "calc": _ag_n_demand},
    "AG_N_SHOOT":    {"name": "地上部氮分配量",        "en": "AgroC shoot nitrogen allocation",            "expr": "TN_uptake*Biom_shoot/(Biom_shoot+Biom_root)",                  "unit": "g N/m2",            "prec": 3, "params": ["Plant_TN_uptake", "Biom_shoot", "Biom_root"],                   "calc": _ag_n_shoot},
    "AG_SOIL_TEMP":  {"name": "土壤碳分解温度因子",     "en": "AgroC soil carbon temperature factor",       "expr": "2.4^((Tsoil-10)*0.1)",                                         "unit": "multiplier",        "prec": 3, "params": ["Temp", "is_soil_temp"],                                          "calc": _ag_soil_temp},
    "AG_SOIL_WATER": {"name": "土壤碳分解水分因子",     "en": "AgroC soil carbon water factor",             "expr": "0.49*exp(3.88*w-5.4*w^2)",                                     "unit": "fraction",          "prec": 3, "params": ["Soil_Water", "Saturate_Water", "BD"],                          "calc": _ag_soil_water},
    "AG_SOIL_PH":    {"name": "土壤pH分解因子",        "en": "AgroC soil pH decomposition factor",         "expr": "1/(1+exp(2.5*(5-pH)))",                                        "unit": "fraction",          "prec": 3, "params": ["pH"],                                                           "calc": _ag_soil_ph},
    "AG_POOL_DECOMP":{"name": "碳库呼吸损失",          "en": "AgroC carbon pool respiration loss",         "expr": "Pool*K*Ft*Fw*Ftex*FpH*Fnotill*(1-Ktrans)",                     "unit": "g C/m2/day",        "prec": 3, "params": ["Pool", "Coef_K_Decom", "F_temp", "F_water", "F_texture", "F_pH", "F_notill", "Coef_K_Trans"], "calc": _ag_pool_decomp},
    "AG_NUE":        {"name": "氮利用效率",           "en": "Nitrogen use efficiency",                    "expr": "GrainYield / NUptake",                                         "unit": "kg grain/kg N",     "prec": 2, "params": ["GrainYield", "NUptake"],                                        "calc": _ag_nue},
    "SIMPLE_DTT":    {"name": "每日有效积温",          "en": "SIMPLE daily thermal time",                  "expr": "max(Tmean - Tbase, 0)",                                        "unit": "C day",             "prec": 2, "params": ["Tmean", "Tbase"],                                                "calc": _simple_dtt},
    "SIMPLE_FTEMP":  {"name": "SIMPLE温度响应",        "en": "SIMPLE temperature response",                "expr": "piecewise linear to Topt",                                     "unit": "fraction",          "prec": 3, "params": ["Tmean", "Tbase", "Topt"],                                       "calc": _simple_ftemp},
    "SIMPLE_FCO2":   {"name": "SIMPLE二氧化碳响应",     "en": "SIMPLE CO2 response",                        "expr": "piecewise linear cap at CO2=700",                               "unit": "multiplier",        "prec": 3, "params": ["CO2", "CO2_RUE"],                                                "calc": _simple_fco2},
    "SIMPLE_FWATER": {"name": "SIMPLE水分响应",        "en": "SIMPLE water stress response",               "expr": "max(0, 1 - S_Water * ARID)",                                   "unit": "fraction",          "prec": 3, "params": ["ARID", "S_Water"],                                               "calc": _simple_fwater},
    "SIMPLE_FHEAT":  {"name": "SIMPLE高温响应",        "en": "SIMPLE heat stress response",                "expr": "piecewise linear by MaxT/ExtremeT",                            "unit": "fraction",          "prec": 3, "params": ["Tmax", "MaxT", "ExtremeT"],                                     "calc": _simple_fheat},
    "SIMPLE_FSOLAR": {"name": "SIMPLE光截获比例",      "en": "SIMPLE solar interception fraction",         "expr": "double logistic canopy dynamics",                              "unit": "fraction",          "prec": 3, "params": ["fSolarMax", "TT", "I50A", "I50B", "Tsum", "fSolar_water"],     "calc": _simple_fsolar},
    "SIMPLE_BIOMASS":{"name": "SIMPLE日生物量增量",     "en": "SIMPLE daily biomass increment",             "expr": "10*RUE*fSolar*SRAD*F_CO2*F_T*min(F_W,F_H)",                    "unit": "kg/ha/day",         "prec": 2, "params": ["RUE", "fSolar", "SRAD", "F_CO2", "F_Temp", "F_Water", "F_Heat"], "calc": _simple_biomass},
    "SIMPLE_YIELD":  {"name": "SIMPLE产量",           "en": "SIMPLE yield",                               "expr": "Biomass * HI",                                                 "unit": "kg/ha",             "prec": 1, "params": ["Biomass", "HI"],                                                "calc": _simple_yield},
}


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: calc.py <formula_id> [param=value ...]", file=sys.stderr)
        print(f"\nAvailable formulas ({len(_FORMULAS)}):", file=sys.stderr)
        for fid in sorted(_FORMULAS):
            f = _FORMULAS[fid]
            print(f"  {fid:20s}  {f['name']}  ({f['en']})", file=sys.stderr)
        sys.exit(1)

    fid = sys.argv[1].upper()
    if fid not in _FORMULAS:
        print(f"ERROR: Unknown formula '{fid}'", file=sys.stderr)
        matches = [k for k in _FORMULAS if fid in k]
        if matches: print(f"Did you mean: {', '.join(matches[:5])}?", file=sys.stderr)
        sys.exit(1)

    spec = _FORMULAS[fid]
    params: dict[str, float] = {}
    for arg in sys.argv[2:]:
        if "=" not in arg:
            print(f"ERROR: Invalid parameter format '{arg}'", file=sys.stderr)
            sys.exit(1)
        name, val_str = arg.split("=", 1)
        try:
            params[name.strip()] = float(val_str)
        except ValueError:
            print(f"ERROR: Cannot parse '{val_str}' as float for '{name}'", file=sys.stderr)
            sys.exit(1)

    missing = [n for n in spec["params"] if n not in params]
    if missing:
        print(f"ERROR: Missing parameters: {', '.join(missing)}", file=sys.stderr)
        print(f"Required: {', '.join(spec['params'])}", file=sys.stderr)
        sys.exit(1)

    try:
        result = round(float(spec["calc"](params)), spec["prec"])
    except Exception as e:
        print(f"ERROR: Calculation failed: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"formula: {fid}")
    print(f"name: {spec['name']} ({spec['en']})")
    print(f"expression: {spec['expr']}")
    print(f"unit: {spec['unit']}")
    print(f"result: {result:.{spec['prec']}f}")


if __name__ == "__main__":
    main()

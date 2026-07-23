# CropMath Formula Reference

Complete catalog of 62 mechanistic crop formulas across 4 model families.
Source: CropMath benchmark (Yuanyuan Ma, Nanjing Agriculture University).

---

## Quick Search: Natural Language → Formula ID

Use this index when the user describes a process in plain language.

| Keyword (CN) | Keyword (EN) | Formula ID | Family |
|---|---|---|---|
| 光能截获、光截获率 | light interception | RG_FPAR | RiceGrow |
| 截获PAR | intercepted PAR | RG_RINT | RiceGrow |
| CO2因子、CO2效应 | CO2 factor | RG_FCO2 | RiceGrow |
| 生理年龄 | physiological age | RG_FPA | RiceGrow |
| 消光系数 | extinction coefficient | RG_K_PDT | RiceGrow |
| 最大同化速率、最大光合 | max assimilation rate | RG_AMAX | RiceGrow |
| 温度响应 | temperature response | RG_FTMP | RiceGrow |
| 高温胁迫、高温结实 | high-temp fertility | RG_HTF | RiceGrow |
| 低温胁迫、低温结实 | low-temp fertility | RG_LTF | RiceGrow |
| 热效应、发育速率 | thermal effectiveness | RG_RTE_BETA | RiceGrow |
| 临界日长 | critical daylength | RG_PC | RiceGrow |
| 光周期 | photoperiod | RG_RPE | RiceGrow |
| 生理效应 | daily physiological effect | RG_DPE | RiceGrow |
| 出苗积温 | emergence GDD | RG_EMGDD | RiceGrow |
| 维持呼吸（水稻） | maintenance respiration | RG_RM | RiceGrow |
| 生长呼吸 | growth respiration | RG_RG | RiceGrow |
| 干物质增量 | daily dry matter | RG_GCR | RiceGrow |
| 比叶面积 | specific leaf area | RG_SLA | RiceGrow |
| 叶面积指数 | LAI / potential LAI | RG_LAIP_EXP | RiceGrow |
| 收获指数 | harvest index | RG_HI | RiceGrow |
| 穗分配 | panicle partitioning | RG_PIP | RiceGrow |
| 稻谷产量 | grain yield | RG_YIELD_DRY | RiceGrow |
| 土壤温度、气温推算 | soil temp from air | CH4_TSOIL_AIR | CH4MOD |
| 甲烷温度指数 | methane temp index | CH4_TI | CH4MOD |
| 氧化还原 | redox potential | CH4_FEH | CH4MOD |
| 根系碳 | root carbon | CH4_CR | CH4MOD |
| 水分分解 | water decomposition | CH4_WI | CH4MOD |
| 有机质分解 | organic matter decomp | CH4_OMNC / CH4_OMSC | CH4MOD |
| 甲烷产生 | methane production | CH4_PROD | CH4MOD |
| 冒泡排放 | ebullition | CH4_EBL | CH4MOD |
| 植株传输 | plant transport | CH4_FP | CH4MOD |
| 甲烷总排放 | total methane emission | CH4_E_TOTAL | CH4MOD |
| CO2施肥 | CO2 fertilization | AG_CO2_FERT | AgroC |
| 冠层PAR | canopy PAR | AG_PAR | AgroC |
| 光合速率 | photosynthetic rate | AG_PHOTO_OPT | AgroC |
| 总初级生产力 | GPP | AG_GPP | AgroC |
| 作物温度因子 | crop temp factor | AG_TEMP_CROP | AgroC |
| 作物水分因子 | crop water factor | AG_WATER_CROP | AgroC |
| 植株呼吸 | plant respiration | AG_PLANT_RM | AgroC |
| 需氮量 | nitrogen demand | AG_N_DEMAND | AgroC |
| 氮利用效率 | NUE | AG_NUE | AgroC |
| 土壤温度因子 | soil temp factor | AG_SOIL_TEMP | AgroC |
| 土壤水分因子 | soil water factor | AG_SOIL_WATER | AgroC |
| 土壤pH | soil pH | AG_SOIL_PH | AgroC |
| 碳库分解 | carbon pool decomp | AG_POOL_DECOMP | AgroC |
| 积温 | daily thermal time | SIMPLE_DTT | SIMPLE |
| 温度响应 | temp response | SIMPLE_FTEMP | SIMPLE |
| CO2响应 | CO2 response | SIMPLE_FCO2 | SIMPLE |
| 水分响应 | water response | SIMPLE_FWATER | SIMPLE |
| 高温响应 | heat response | SIMPLE_FHEAT | SIMPLE |
| 光截获 | solar interception | SIMPLE_FSOLAR | SIMPLE |
| 生物量 | biomass increment | SIMPLE_BIOMASS | SIMPLE |
| 产量 | yield | SIMPLE_YIELD | SIMPLE |

---

## RiceGrow (29 formulas)

Rice growth and physiology model. Source: Tang et al. 2009.

### Photosynthesis

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_FPAR | 光能截获率 | `1 - exp(-k * LAI)` | fraction | k (0.35–0.75), LAI (0.8–6.5) |
| RG_RINT | 截获光合有效辐射 | `PAR * (1 - exp(-k * LAI))` | MJ/m2/day | PAR (6–18), k (0.35–0.75), LAI (0.8–6.5) |
| RG_FCO2 | 二氧化碳影响因子 | `1 + beta * ln(Cx / 340)` | multiplier | Cx (360–720 ppm), beta (0.35–0.95) |
| RG_FPA | 生理年龄因子 | `if PDT<28: 1; else: exp(-a*(PDT-28))` | fraction | PDT (12–57), a (0.015–0.07) |
| RG_K_PDT | 冠层消光系数 | `0.0087 * PDT + 0.2222` | dimensionless | PDT (0–57) |
| RG_AMAX | 实际最大同化速率 | `Am * FCO2 * FPA * FT * min(NNI, WDF)` | kg CO2/ha/h | Am (25–55), FCO2, FPA, FT, NNI (0.45–1.1), WDF (0.45–1.1) |

### Temperature Response

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_FTMP | 温度响应因子 | Piecewise sin/cos (Tb→Tol→Tou→Tmax) | fraction | T (12–42), Tb=10, Tol=24, Tou=34, Tmax=45 |

### Temperature Stress

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_HTF | 高温结实因子 | `1/(1+exp(0.853*(Tmax_day-36.6)))` if PDT∈[32,39] | fraction | PDT (32–39), Tmax_day (34–42) |
| RG_LTF | 低温结实因子 | `1-(4.6+0.054*Qt^1.56)/100` if PDT∈[26,39] & Tmean<22 | fraction | PDT (26–39), Tmean (16–23), Qt (1–24) |

### Phenology

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_RTE_BETA | 相对热效应 | Beta temperature response with TS exponent | fraction | T (12–40), Tb=10, To=30, Tm=42, TS (0.8–1.8) |
| RG_PC | 临界日长 | `Po + sqrt(1 / PS)` | h | Po=10.5, PS (0.08–0.35) |
| RG_RPE | 相对光周期效应 | Piecewise quadratic in P-Po | fraction | P (9.5–15.5), Po=10.5, PS (0.08–0.35) |
| RG_DPE | 每日生理效应 | Stage-dependent product (IE/RPE/1/BFF) | phys days/day | PDT (0–56), DTE (0.25–1), IE (0.65–1.25), RPE, BFF (0.65–1.25) |
| RG_EMGDD | 出苗热量需求 | `45 + 7 * SDEPTH` | C day | SDEPTH (1–5.5 cm) |

### Respiration

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_RMTO | 最适温度维持呼吸系数 | `0.0091 - 0.0001 * PDT` | d-1 | PDT (0–57) |
| RG_RM | 维持呼吸 | `RMTO * ABIOMASS * Q10^((T-To)/10)` | kg/ha/day | PDT, ABIOMASS (2000–18000), Q10 (1.7–2.3), T (16–38), To (28–30) |
| RG_RG | 生长呼吸 | `Rg * DTGA` | kg/ha/day | Rg (0.18–0.42), DTGA (120–520) |
| RG_GCR | 日干物质增量 | `(DTGA - RM - RG) / (1 - b)` | kg/ha/day | DTGA (180–620), RM (20–120), RG (20–160), b=0.05 |

### Leaf Area Growth

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_SLA | 比叶面积 | Piecewise quadratic in GDD | cm2/g | GDD (50–800), SLAc (140–260) |
| RG_LAIP_EXP | 潜在叶面积指数 | `LAI0 * exp(RP * GDD)` | m2/m2 | LAI0 (0.05–0.35), RP (0.003–0.008), GDD (120–680) |
| RG_R_LAI_STRESS | 实际叶面积相对增长率 | `RP * min(NNI, WDF)` | d-1 | RP (0.003–0.009), NNI (0.45–1.1), WDF (0.45–1.1) |
| RG_LAI_SLA | 比叶面积法叶面积指数 | `SLA * AWL` | m2/m2 | SLA (0.00012–0.00042), AWL (800–8500) |

### Dry Matter Partitioning

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_HI | 收获指数 | `Y_grain / B_above` | fraction | Y_grain (3500–9000), B_above (9000–19000) |
| RG_PIP | 穗分配指数 | `(HI/0.87) / (1+exp(-0.2804*(PDT-39)))` | fraction | Y_grain, B_above, PDT (24–57) |
| RG_PISH | 地上部分配指数 | `-8.42e-5*PDT^2 + 0.01*PDT + 0.63` | fraction | PDT (0–57) |
| RG_PIGL | 绿叶分配指数 | Piecewise linear/exp by PDT | fraction | PDT (0–57) |
| RG_PIRO | 地下部分配指数 | `1 - PISH` | fraction | PDT (0–57) |
| RG_PIS_STEM | 茎鞘分配指数 | `1 - PIGL - PIP` | fraction | PDT (24–57), Y_grain (3500–8000), B_above (10500–19000) |

### Yield Formation

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| RG_YIELD_DRY | 稻谷干重产量 | `AWSP * grain_fraction` | kg/ha | AWSP (3500–10500), grain_fraction (0.82–0.92) |

---

## CH4MOD (11 formulas)

Methane emissions model for paddy soils. Source: Huang 1998; CH4MOD code.

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| CH4_TSOIL_AIR | 土壤温度估算 | `4.4 + 0.76 * Tair` | C | Tair (12–36) |
| CH4_TI | 甲烷温度指数 | `Q10^((min(t_soil,30)-30)/10)` | multiplier | Q10 (2–4), t_soil (15–42) |
| CH4_FEH | 氧化还原电位因子 | `if Eh<-150: 1; else: exp(-1.7*(1+Eh/150))` | fraction | Eh (-230–160 mV) |
| CH4_CR | 根系分泌碳底物 | `0.0018 * VI * SI * W^1.25` | g C/m2/day | VI (0.7–1.3), SI (0.6–1.4), W (500–8500) |
| CH4_WI | 水分分解因子 | `0.49 * exp(3.88*WaterC - 5.4*WaterC^2)` | fraction | WaterC (0.25–0.75) |
| CH4_OMNC | 新鲜有机质碳分解量 | `WI * SI * TI * 0.027 * OMN` | g C/m2/day | WI, SI, TI, OMN (20–260) |
| CH4_OMSC | 土壤有机质碳分解量 | `WI * SI * TI * 0.003 * OMS` | g C/m2/day | WI, SI, TI, OMS (250–1800) |
| CH4_PROD | 甲烷产生量 | `max(0, 0.27*FEh*(TI*Cr+Com))` | g CH4/m2/day | FEh (0.05–1), TI, Cr (1–90), Com (0.05–8) |
| CH4_EBL | 甲烷冒泡排放 | `min(0.7*ln(t_soil)/Wr, 0.9) * P` | g CH4/m2/day | P (0.5–18), t_soil (12–36), Wr (150–2800) |
| CH4_FP | 植株传输因子 | `CH4RiceEfC * (1-W/Wmax)^0.25` | fraction | CH4RiceEfC (0.15–0.55), W (500–7000), Wmax (8000–14000) |
| CH4_E_TOTAL | 甲烷总排放 | `Ebl + P * CH4RiceEfC * (1-W/Wmax)^0.25` | g CH4/m2/day | Ebl, P, CH4RiceEfC, W, Wmax |

---

## AgroC (14 formulas)

Agroecosystem carbon/crop model. Source: AgroC Common.R.

### Photosynthesis

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| AG_CO2_FERT | 作物二氧化碳施肥因子 | `1 + Coef_B_CO2 * ln(CO2/340)` | multiplier | CO2 (330–760), Coef_B_CO2 (0.2–0.8) |
| AG_PAR | 冠层吸收光合有效辐射 | `Radi*0.44*4.6*(1-rou)*(1-exp(-K*LAI))/(K*LAI)` | umol/m2/s | Radi (120–720), LAI (0.4–6.5), Coef_rou (0.08–0.25), Coef_K (0.35–0.8) |
| AG_PHOTO_OPT | 最适光合速率 | `(Coef_alfa * Leaf_N) * PAR / (PAR + Coef_beta)` | umol CO2/m2/s | Coef_alfa (8–28), Coef_beta (80–360), PAR (80–1200), Leaf_N (0.6–4.5) |
| AG_GPP | 总初级生产力 | `Photo_Rate_opt * F_T * F_Water * F_CO2 * DL * 0.0432` | g C/m2/day | Photo_Rate_opt, F_T, F_Water, F_CO2, Day_Length_hour (9–15.5) |

### Stress Factors

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| AG_TEMP_CROP | 作物温度活性因子 | Beta temperature response | fraction | Td (6–38), Tmin_active=3, Topt_active=25, Tmax_active=42, Coef_T_M (0.1–0.8) |
| AG_WATER_CROP | 作物水分胁迫因子 | Piecewise water response | fraction | Soil_Water (0.08–0.58), Crop_Water_max=0.42, Crop_Water_min=0.22, Wilt_point=0.08 |

### Respiration

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| AG_PLANT_RM | 植株维持呼吸 | Q10 with DVI correction | g C/m2/day | Biom_plant_yesterday (80–950), Coef_Rm (0.0004–0.004), Tmn (8–34), DVI (0.2–1.8) |

### Nitrogen

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| AG_N_DEMAND | 作物需氮量 | Piecewise minimum by NPP and N_shoot | g N/m2/day | N_shoot, Coef_Plant_TN_uptake, N_requirement_max_day, NPP, Ratio_N_C, DVI |
| AG_N_SHOOT | 地上部氮分配量 | `Plant_TN_uptake * Biom_shoot/(Biom_shoot+Biom_root)` | g N/m2 | Plant_TN_uptake (1–18), Biom_shoot (80–850), Biom_root (20–320) |
| AG_NUE | 氮利用效率 | `GrainYield / NUptake` | kg grain/kg N | GrainYield (3500–9500), NUptake (60–210) |

### Soil Carbon

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| AG_SOIL_TEMP | 土壤碳分解温度因子 | `2.4^((Tsoil-10)*0.1)` | multiplier | Temp (5–34), is_soil_temp (0/1) |
| AG_SOIL_WATER | 土壤碳分解水分因子 | `0.49*exp(3.88*w-5.4*w^2)` | fraction | Soil_Water (0.08–0.55), Saturate_Water=0.48, BD (1.05–1.55) |
| AG_SOIL_PH | 土壤pH分解因子 | `1/(1+exp(2.5*(5-pH)))` | fraction | pH (3.8–8.6) |
| AG_POOL_DECOMP | 碳库呼吸损失 | `Pool*K*Ftemp*Fwater*Ftex*FpH*Fnotill*(1-Ktrans)` | g C/m2/day | Pool, Coef_K_Decom, F_temp, F_water, F_texture, F_pH, F_notill, Coef_K_Trans |

---

## SIMPLE (8 formulas)

Simplified crop growth model. Source: Simple-Crop-Model/core.py.

| ID | Name | Expression | Unit | Parameters |
|----|------|-----------|------|------------|
| SIMPLE_DTT | 每日有效积温 | `max(Tmean - Tbase, 0)` | C day | Tmean (0–34), Tbase (4–12) |
| SIMPLE_FTEMP | SIMPLE温度响应 | `if Tmean>=Topt: 1; else: max((Tmean-Tbase)/(Topt-Tbase), 0)` | fraction | Tmean (0–34), Tbase (4–10), Topt (22–30) |
| SIMPLE_FCO2 | SIMPLE二氧化碳响应 | Piecewise linear cap at CO2=700 | multiplier | CO2 (330–820), CO2_RUE (0.05–0.18) |
| SIMPLE_FWATER | SIMPLE水分响应 | `max(0, 1 - S_Water * ARID)` | fraction | ARID (0–2.5), S_Water (0.15–0.75) |
| SIMPLE_FHEAT | SIMPLE高温响应 | Piecewise linear by Tmax/MaxT/ExtremeT | fraction | Tmax (24–46), MaxT (32–36), ExtremeT (42–48) |
| SIMPLE_FSOLAR | SIMPLE光截获比例 | Double logistic canopy dynamics | fraction | fSolarMax (0.75–0.98), TT (120–1700), I50A (180–520), I50B (180–560), Tsum (1200–2300), fSolar_water (0.6–1) |
| SIMPLE_BIOMASS | SIMPLE日生物量增量 | `10*RUE*fSolar*SRAD*F_CO2*F_T*min(F_W,F_H)` | kg/ha/day | RUE (1.1–3.8), fSolar, SRAD (8–28), F_CO2, F_Temp, F_Water, F_Heat |
| SIMPLE_YIELD | SIMPLE产量 | `Biomass * HI` | kg/ha | Biomass (3500–22000), HI (0.25–0.62) |

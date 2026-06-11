---
name: cropmath
description: 作物机理公式计算与验证——覆盖 RiceGrow（水稻生长）、CH4MOD（稻田甲烷排放）、AgroC（农田碳循环）、SIMPLE（简化作物模型）四个模型家族共 62 个公式。当用户询问作物模型公式、参数计算、数值验证、模型代码编写、DSSAT/APSIM/WOFOST 相关公式解释，或需要对光合作用、呼吸、蒸散、甲烷排放、氮循环、产量形成等机理过程进行数值计算时使用。
---

# CropMath — 作物机理公式计算

本技能提供 62 个经过验证的作物机理公式，覆盖 4 个模型家族。可用于公式解释、参数查询、数值验证和代码生成。

## Formula Catalog

### RiceGrow（水稻生长模型，29 个公式）

**光合作用:** RG_FPAR（光能截获率）、RG_RINT（截获PAR）、RG_FCO2（CO2因子）、RG_FPA（生理年龄因子）、RG_K_PDT（消光系数）、RG_AMAX（最大同化速率）
**温度响应:** RG_FTMP（温度响应因子，分段三角函数）
**温度胁迫:** RG_HTF（高温结实因子）、RG_LTF（低温结实因子）
**物候发育:** RG_RTE_BETA（相对热效应）、RG_PC（临界日长）、RG_RPE（光周期效应）、RG_DPE（每日生理效应）、RG_EMGDD（出苗热量需求）
**呼吸:** RG_RMTO（维持呼吸系数）、RG_RM（维持呼吸）、RG_RG（生长呼吸）、RG_GCR（日干物质增量）
**叶面积:** RG_SLA（比叶面积）、RG_LAIP_EXP（潜在LAI）、RG_R_LAI_STRESS（实际LAI增长率）、RG_LAI_SLA（SLA法LAI）
**干物质分配:** RG_HI（收获指数）、RG_PIP（穗分配指数）、RG_PISH（地上部分配）、RG_PIGL（绿叶分配）、RG_PIRO（地下部分配）、RG_PIS_STEM（茎鞘分配）
**产量:** RG_YIELD_DRY（稻谷干重产量）

### CH4MOD（稻田甲烷排放模型，11 个公式）

CH4_TSOIL_AIR（土壤温度）、CH4_TI（温度指数）、CH4_FEH（氧化还原因子）、CH4_CR（根系碳底物）、CH4_WI（水分因子）、CH4_OMNC（新鲜有机质分解）、CH4_OMSC（土壤有机质分解）、CH4_PROD（甲烷产生）、CH4_EBL（冒泡排放）、CH4_FP（植株传输因子）、CH4_E_TOTAL（总排放）

### AgroC（农田碳循环模型，14 个公式）

**光合作用:** AG_CO2_FERT（CO2施肥）、AG_PAR（冠层PAR）、AG_PHOTO_OPT（最适光合速率）、AG_GPP（总初级生产力）
**胁迫:** AG_TEMP_CROP（温度因子）、AG_WATER_CROP（水分因子）
**呼吸:** AG_PLANT_RM（维持呼吸）
**氮循环:** AG_N_DEMAND（需氮量）、AG_N_SHOOT（地上部氮分配）、AG_NUE（氮利用效率）
**土壤碳:** AG_SOIL_TEMP（温度因子）、AG_SOIL_WATER（水分因子）、AG_SOIL_PH（pH因子）、AG_POOL_DECOMP（碳库分解）

### SIMPLE（简化作物模型，8 个公式）

SIMPLE_DTT（有效积温）、SIMPLE_FTEMP（温度响应）、SIMPLE_FCO2（CO2响应）、SIMPLE_FWATER（水分响应）、SIMPLE_FHEAT（高温响应）、SIMPLE_FSOLAR（光截获）、SIMPLE_BIOMASS（生物量增量）、SIMPLE_YIELD（产量）

## Natural Language Formula Index

用户常说的描述 → 对应公式 ID。按使用频率排序。

| 用户可能说的（中文/英文） | 公式 ID | 公式名 |
|---|---|---|
| 光能截获率 / light interception / 光截获 | RG_FPAR | 光能截获率 |
| 截获的PAR / intercepted PAR | RG_RINT | 截获光合有效辐射 |
| CO2影响 / CO2效应 / CO2 factor | RG_FCO2 | CO2影响因子 |
| 最大同化速率 / 最大光合速率 | RG_AMAX | 实际最大同化速率 |
| 温度响应 / 温度影响 | RG_FTMP | 温度响应因子 |
| 高温对结实的影响 / 高温胁迫 / heat stress on fertility | RG_HTF | 高温结实因子 |
| 低温对结实的影响 / 低温胁迫 / cold stress on fertility | RG_LTF | 低温结实因子 |
| 发育速率 / 相对热效应 / thermal effectiveness | RG_RTE_BETA | 相对热效应 |
| 临界日长 / critical daylength | RG_PC | 临界日长 |
| 光周期效应 / photoperiod effect | RG_RPE | 相对光周期效应 |
| 每日生理效应 / daily physiological effect | RG_DPE | 每日生理效应 |
| 出苗需要多少积温 / emergence thermal requirement | RG_EMGDD | 出苗热量需求 |
| 维持呼吸 / maintenance respiration | RG_RM | 维持呼吸 |
| 生长呼吸 / growth respiration | RG_RG | 生长呼吸 |
| 每天干物质增加多少 / daily dry matter increment | RG_GCR | 日干物质增量 |
| 比叶面积 / specific leaf area / SLA | RG_SLA | 比叶面积 |
| 叶面积指数 / LAI / 潜在LAI | RG_LAIP_EXP | 潜在叶面积指数 |
| 收获指数 / harvest index / HI | RG_HI | 收获指数 |
| 穗分配 / panicle partitioning | RG_PIP | 穗分配指数 |
| 稻谷产量 / 干重产量 / grain yield | RG_YIELD_DRY | 稻谷干重产量 |
| 气温推算土温 / 土壤温度 / soil temperature from air | CH4_TSOIL_AIR | 土壤温度估算 |
| 甲烷温度指数 / methane temperature index | CH4_TI | 甲烷温度指数 |
| 氧化还原电位 / redox potential factor | CH4_FEH | 氧化还原电位因子 |
| 根系碳底物 / root carbon substrate | CH4_CR | 根系分泌碳底物 |
| 水分分解因子 / water decomposition factor | CH4_WI | 水分分解因子 |
| 甲烷产生 / methane production | CH4_PROD | 甲烷产生量 |
| 冒泡排放 / ebullition emission | CH4_EBL | 甲烷冒泡排放 |
| 植株传输甲烷 / plant methane transport | CH4_FP | 植株传输因子 |
| 甲烷总排放 / total methane emission | CH4_E_TOTAL | 甲烷总排放 |
| CO2施肥效应 / CO2 fertilization | AG_CO2_FERT | CO2施肥因子 |
| 冠层PAR / canopy absorbed PAR | AG_PAR | 冠层吸收PAR |
| 总初级生产力 / GPP / gross primary production | AG_GPP | 总初级生产力 |
| 作物需氮量 / nitrogen demand | AG_N_DEMAND | 作物需氮量 |
| 氮利用效率 / NUE / nitrogen use efficiency | AG_NUE | 氮利用效率 |
| 土壤碳分解温度 / soil carbon temperature factor | AG_SOIL_TEMP | 土壤碳分解温度因子 |
| 土壤pH影响 / soil pH factor | AG_SOIL_PH | 土壤pH分解因子 |
| 碳库分解 / carbon pool decomposition | AG_POOL_DECOMP | 碳库呼吸损失 |
| 有效积温 / daily thermal time / GDD | SIMPLE_DTT | 每日有效积温 |
| 高温响应 / heat stress response | SIMPLE_FHEAT | SIMPLE高温响应 |
| 水分响应 / water stress response | SIMPLE_FWATER | SIMPLE水分响应 |
| 光截获比例 / solar interception | SIMPLE_FSOLAR | SIMPLE光截获比例 |
| 生物量增量 / biomass increment | SIMPLE_BIOMASS | 日生物量增量 |
| 产量 / yield | SIMPLE_YIELD | SIMPLE产量 |

## When to use this Skill

Use this Skill when the user asks about **any** of the following — even if they
do NOT know the formula ID or technical term:

- **光合作用 / photosynthesis** — 光能截获、PAR吸收、CO2影响、最大同化速率
- **温度 / temperature** — 温度响应、高温/低温胁迫、积温、热效应
- **呼吸 / respiration** — 维持呼吸、生长呼吸、日干物质增量
- **叶面积 / leaf area** — 比叶面积、LAI、叶面积增长
- **物候 / phenology** — 发育速率、日长效应、生理年龄、出苗
- **干物质分配 / partitioning** — 收获指数、穗/叶/茎/根分配
- **产量 / yield** — 稻谷产量、生物量
- **甲烷排放 / methane** — 甲烷产生、冒泡排放、植株传输、总排放
- **土壤温度 / soil temperature** — 气温推算土温
- **氮循环 / nitrogen** — 需氮量、氮分配、氮利用效率
- **碳循环 / carbon** — GPP、碳库分解、土壤碳
- **水分胁迫 / water stress** — 水分因子、干旱响应
- **pH / 土壤酸碱度** — pH对分解的影响
- **CO2效应** — CO2施肥效应、CO2响应
- **作物模型代码** — RiceGrow、CH4MOD、AgroC、SIMPLE 的实现
- **DSSAT / APSIM / WOFOST** — 相关公式解释

用户可能用中文或英文提问，可能描述生理过程而非公式名。
例如："帮我算一下水稻的光能截获率"、"气温30度时土壤温度多少"、
"甲烷排放怎么算"、"这个公式 1-exp(-k*LAI) 是什么意思"。

## Instructions

### Step 1: Identify the relevant formula from natural language

Most users will NOT know formula IDs. They describe what they want to calculate
in everyday language. Follow this matching process:

**1a. Extract the user's intent** — what quantity do they want to compute?

Look for clues in their words:
- "光能截获" / "light interception" → RG_FPAR
- "土壤温度" / "soil temperature" / "气温推算" → CH4_TSOIL_AIR
- "甲烷排放" / "methane emission" → CH4_E_TOTAL
- "水分因子" / "水分分解" / "water factor" → CH4_WI (or AG_WATER_CROP / SIMPLE_FWATER depending on context)
- "呼吸" / "respiration" → RG_RM or AG_PLANT_RM
- "产量" / "yield" → RG_YIELD_DRY or SIMPLE_YIELD
- "氮利用效率" / "NUE" → AG_NUE
- "积温" / "thermal time" → SIMPLE_DTT
- "光合" / "photosynthesis" → RG_AMAX or AG_GPP
- "高温胁迫" / "heat stress" → RG_HTF or SIMPLE_FHEAT
- "CO2效应" / "CO2 response" → RG_FCO2 or SIMPLE_FCO2
- "LAI" / "叶面积" → RG_LAIP_EXP or RG_LAI_SLA

**1b. Check the model context** — which model family is relevant?
- RiceGrow = 水稻生长（最全面，29个公式）
- CH4MOD = 稻田甲烷排放
- AgroC = 农田碳循环
- SIMPLE = 简化作物模型

**1c. If still uncertain**, read `references/formulas.md` to search by keyword,
category, or Chinese/English name. The file is organized by model family and
physiological category.

**1d. If the user provides a formula ID** (e.g., `RG_FPAR`), look it up directly
in `references/formulas.md`.

### Step 2: Explain the formula

- State the formula ID, Chinese name, and English name.
- Show the mathematical expression.
- List each parameter with its name, unit, and valid range.
- Explain the biological/physical meaning in the user's context.

### Step 3: Verify calculations (when requested)

When the user provides parameter values and asks for a calculation, use the calculator script:

```bash
python <skill_dir>/scripts/calc.py <FORMULA_ID> param1=value1 param2=value2
```

Replace `<skill_dir>` with the absolute path to this skill's directory.

Example:
```bash
python <skill_dir>/scripts/calc.py RG_FPAR k=0.5 LAI=3.0
```

The script outputs:
- `formula`: the formula ID
- `name`: Chinese and English name
- `expression`: mathematical expression
- `unit`: result unit
- `result`: computed value
- `answer_label`: standard label for the result

### Step 4: Generate code (when requested)

When the user needs Python/R code for a formula:
1. Read the formula definition from `references/formulas.md`.
2. Generate a clean implementation with type hints and docstrings.
3. Include parameter validation using the documented ranges.
4. Use `math` module for mathematical functions (exp, log, sin, cos, sqrt).

## Best Practices

1. **Always verify calculations** — use the calculator script rather than computing manually. LLMs make arithmetic errors.
2. **Respect parameter ranges** — warn the user if their input values fall outside documented ranges.
3. **Cite the source** — each formula has a `source` field referencing the original paper or model code.
4. **Explain piecewise logic** — many formulas have conditional branches (e.g., temperature stress). Walk through which branch applies for given inputs.
5. **Chain formulas carefully** — some formulas depend on outputs of others (e.g., RG_AMAX needs FCO2, FPA, FT). Document the dependency chain.

## Natural Language Interaction Examples

### Example 1: Simple calculation

User: "帮我算一下水稻的光能截获率，k=0.5, LAI=3.0"

Agent:
1. Match "光能截获率" → RG_FPAR (from Natural Language Formula Index)
2. Run: `python <skill_dir>/scripts/calc.py RG_FPAR k=0.5 LAI=3.0`
3. Output: "光能截获率 (Light interception fraction) = 0.78 (fraction)"

### Example 2: Process description

User: "气温30度的时候，稻田土壤温度大概多少？"

Agent:
1. Match "气温→土壤温度" → CH4_TSOIL_AIR
2. Run: `python <skill_dir>/scripts/calc.py CH4_TSOIL_AIR Tair=30.0`
3. Output: "土壤温度 ≈ 27.2°C（公式: Tsoil = 4.4 + 0.76 × Tair）"

### Example 3: Conceptual question

User: "什么是甲烷的冒泡排放？"

Agent:
1. Match "冒泡排放" → CH4_EBL
2. Read `references/formulas.md` for CH4_EBL definition
3. Explain: 公式含义、参数、适用条件，不调用 calc.py

### Example 4: Uncertain match

User: "水分因子怎么算？"

Agent:
1. "水分因子" 匹配到多个公式: CH4_WI, AG_WATER_CROP, SIMPLE_FWATER
2. Ask user: "有三个水分相关公式，你想算哪个？
   - CH4MOD 的水分分解因子（稻田甲烷排放用）
   - AgroC 的作物水分胁迫因子
   - SIMPLE 的水分响应因子"
3. User 选择后继续

### Example 5: Code generation

User: "帮我写一个 Python 函数，输入气温，输出稻田土壤温度"

Agent:
1. Match → CH4_TSOIL_AIR
2. Read `references/formulas.md` for formula definition
3. Generate Python function with type hints, docstring, and parameter validation

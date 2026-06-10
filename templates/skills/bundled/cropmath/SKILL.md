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

## When to use this Skill

Use this Skill when the user:

- Asks about crop model formulas or their parameters
- Needs to calculate a value from any of the 62 formulas above
- Wants help writing code for RiceGrow, CH4MOD, AgroC, or SIMPLE models
- Asks to verify a numeric result from a crop model calculation
- Discusses photosynthesis, respiration, methane emission, nitrogen cycling, or yield formation modeling
- Needs parameter ranges or units for crop model formulas
- Asks about DSSAT, APSIM, WOFOST, or other crop model formula implementations

## Instructions

### Step 1: Identify the relevant formula

1. Read `references/formulas.md` to find the formula(s) matching the user's query.
2. If the user provides a formula ID (e.g., `RG_FPAR`), look it up directly.
3. If the user describes a process (e.g., "light interception"), search by category or keyword.

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

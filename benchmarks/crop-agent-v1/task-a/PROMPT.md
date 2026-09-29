修复 `src/heat.py` 中的 `analyze_weather(path)`，使它按下面的科研数据契约工作。请实际修改代码、运行你认为必要的本地检查，并简述结果。只使用 Python 标准库，不修改 `raw/weather.csv`。

输入 CSV 表头固定为 `date,tmin_c,tmax_c`。日期为 ISO `YYYY-MM-DD`。空字符串或 `-999` 表示缺测：整天跳过并在 `missing_dates` 中记录日期。其余温度须为有限数，且 `tmin_c <= tmax_c`；错误输入抛 `ValueError`。同一日期重复也抛 `ValueError`，即使其中一行缺测。输出按日期升序。

水稻逐日积温：先分别把最低、最高温限制在 10–30 ℃，再求平均减 10，结果下限为 0。每日和总积温保留两位小数。函数返回：

`{"days": [{"date": "YYYY-MM-DD", "gdd": number}, ...], "total_gdd": number, "missing_dates": ["YYYY-MM-DD", ...]}`

请勿把缺测日当成 0 ℃·日，不要修改输入数据，也不要只为样例硬编码结果。

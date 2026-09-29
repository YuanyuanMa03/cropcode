修复 `src/evaluate.py` 中的 `evaluate_yield(path)`，使产量模型的率定与独立验证严格分开。请实际修改代码、运行你认为必要的本地检查，并简述结果。只使用 Python 标准库，不修改 `raw/yield.csv`。

输入 CSV 表头固定为 `plot_id,year,partition,observed_t_ha,simulated_t_ha`。`partition` 只能是 `calibrate` 或 `validate`。用**全部有效率定行、仅这些行**计算加性偏差 `bias_t_ha = mean(observed - simulated)`；再对验证行预测 `simulated + bias_t_ha`。验证误差定义为预测减观测；只在有效验证行上计算 `n`、MAE、RMSE、MBE。所有数值结果保留四位小数。

任一观测或模拟值为空、或等于 `-999` 时，整行跳过；其他值必须有限。`year` 必须是整数；相同 `(plot_id, year)` 重复、无有效率定行、无有效验证行、非法分区或其他无效数值都抛 `ValueError`。重复键即使某行缺测也应报错。

返回格式：`{"bias_t_ha": number, "validation": {"n": integer, "mae": number, "rmse": number, "mbe": number}}`。不要让验证集参与偏差拟合，不要只为样例硬编码结果。

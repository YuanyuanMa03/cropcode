"""Yield calibration and validation. This implementation leaks validation data."""

import csv
import math


def evaluate_yield(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append((row["partition"], float(row["observed_t_ha"]), float(row["simulated_t_ha"])))
    bias = sum(obs - sim for _, obs, sim in rows) / len(rows)
    errors = [sim + bias - obs for part, obs, sim in rows if part == "validate"]
    return {
        "bias_t_ha": round(bias, 4),
        "validation": {
            "n": len(errors),
            "mae": round(sum(abs(error) for error in errors) / len(errors), 4),
            "rmse": round(math.sqrt(sum(error * error for error in errors)) / len(rows), 4),
            "mbe": round(sum(errors) / len(errors), 4),
        },
    }

"""Hidden, deterministic filesystem grader for CropCode Agent benchmark v1."""

import csv
import hashlib
import importlib.util
import json
import math
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def write_csv(directory, header, rows):
    path = directory / "case.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)
    return path


def equal(actual, expected):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and actual.keys() == expected.keys() and all(
            equal(actual[key], value) for key, value in expected.items()
        )
    if isinstance(expected, list):
        return isinstance(actual, list) and len(actual) == len(expected) and all(
            equal(left, right) for left, right in zip(actual, expected)
        )
    if isinstance(expected, (float, int)) and not isinstance(expected, bool):
        return isinstance(actual, (float, int)) and math.isclose(actual, expected, abs_tol=0.00011)
    return actual == expected


def run_case(function, header, rows, expected):
    with tempfile.TemporaryDirectory(prefix="crop-agent-grade-") as temporary:
        path = write_csv(Path(temporary), header, rows)
        before = path.read_bytes()
        try:
            result = function(str(path))
            passed = expected is ValueError and False or equal(result, expected)
        except Exception as error:
            passed = expected is ValueError and isinstance(error, ValueError)
        return bool(passed and path.read_bytes() == before)


WEATHER_HEADER = ["date", "tmin_c", "tmax_c"]
YIELD_HEADER = ["plot_id", "year", "partition", "observed_t_ha", "simulated_t_ha"]


def weather_cases():
    def result(days, total, missing=None):
        return {"days": days, "total_gdd": total, "missing_dates": missing or []}

    return [
        ("sample_and_sort", [["2026-07-03", -999, 29], ["2026-07-01", 12, 34], ["2026-07-02", 8, 22]], result([{"date": "2026-07-01", "gdd": 11}, {"date": "2026-07-02", "gdd": 6}], 17, ["2026-07-03"])),
        ("below_base", [["2026-01-01", -5, 8]], result([{"date": "2026-01-01", "gdd": 0}], 0)),
        ("upper_cap", [["2026-07-01", 28, 45]], result([{"date": "2026-07-01", "gdd": 19}], 19)),
        ("both_above_cap", [["2026-07-01", 35, 40]], result([{"date": "2026-07-01", "gdd": 20}], 20)),
        ("blank_and_sentinel", [["2026-07-02", "", 25], ["2026-07-01", 10, -999]], result([], 0, ["2026-07-01", "2026-07-02"])),
        ("duplicate_even_if_missing", [["2026-07-01", "", 25], ["2026-07-01", 12, 25]], ValueError),
        ("inverted_temperature", [["2026-07-01", 20, 19]], ValueError),
        ("nonfinite", [["2026-07-01", "nan", 20]], ValueError),
        ("invalid_calendar_date", [["2026-02-30", 10, 20]], ValueError),
    ]


def yield_result(bias, n, mae, rmse, mbe):
    return {"bias_t_ha": bias, "validation": {"n": n, "mae": mae, "rmse": rmse, "mbe": mbe}}


def yield_cases():
    return [
        ("sample_no_leakage", [["A", 2023, "calibrate", 7.2, 6], ["B", 2023, "calibrate", 8, 7.2], ["C", 2024, "validate", 6.4, 5.6], ["D", 2024, "validate", 7, 7]], yield_result(1, 2, 0.6, 0.7211, 0.6)),
        ("holdout_not_fit", [["A", 2023, "calibrate", 3, 1], ["B", 2024, "validate", 100, 10]], yield_result(2, 1, 88, 88, -88)),
        ("asymmetric_metrics", [["A", 2023, "calibrate", 1, 1], ["B", 2024, "validate", 2, 1], ["C", 2024, "validate", 2, 5]], yield_result(0, 2, 2, 2.2361, 1)),
        ("blank_skipped", [["A", 2023, "calibrate", 3, 2], ["B", 2024, "validate", "", 8], ["C", 2024, "validate", 4, 3]], yield_result(1, 1, 0, 0, 0)),
        ("sentinel_skipped", [["A", 2023, "calibrate", -999, 2], ["B", 2023, "calibrate", 3, 2], ["C", 2024, "validate", 4, 3]], yield_result(1, 1, 0, 0, 0)),
        ("duplicate_even_if_missing", [["A", 2023, "calibrate", "", 2], ["A", 2023, "validate", 4, 3]], ValueError),
        ("invalid_partition", [["A", 2023, "fit", 3, 2], ["B", 2024, "validate", 4, 3]], ValueError),
        ("no_calibration", [["A", 2023, "validate", 4, 3]], ValueError),
        ("no_validation", [["A", 2023, "calibrate", 4, 3]], ValueError),
    ]


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in {"a", "b"}:
        raise SystemExit("usage: python3 grade.py {a|b} WORKSPACE")
    task, workspace = sys.argv[1], Path(sys.argv[2]).resolve()
    source = workspace / "src" / ("heat.py" if task == "a" else "evaluate.py")
    module = None
    try:
        spec = importlib.util.spec_from_file_location("submission", source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception:
        pass
    function = getattr(module, "analyze_weather" if task == "a" else "evaluate_yield", None)
    header, cases = (WEATHER_HEADER, weather_cases()) if task == "a" else (YIELD_HEADER, yield_cases())
    checks = {name: bool(function and run_case(function, header, rows, expected)) for name, rows, expected in cases}
    raw_name = "weather.csv" if task == "a" else "yield.csv"
    baseline = ROOT / f"task-{task}" / "raw" / raw_name
    submission = workspace / "raw" / raw_name
    raw_unchanged = submission.is_file() and hashlib.sha256(baseline.read_bytes()).digest() == hashlib.sha256(submission.read_bytes()).digest()
    print(json.dumps({"task": task, "score": 10 * (sum(checks.values()) + raw_unchanged), "checks": checks, "raw_unchanged": raw_unchanged}, ensure_ascii=False))


if __name__ == "__main__":
    main()

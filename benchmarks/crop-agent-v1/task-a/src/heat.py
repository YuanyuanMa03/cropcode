"""Daily growing degree days for rice. This implementation contains known faults."""

import csv


def analyze_weather(path):
    days = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            low = float(row["tmin_c"] or 0)
            high = float(row["tmax_c"] or 0)
            gdd = max(0, (low + high) / 2 - 10)
            days.append({"date": row["date"], "gdd": round(gdd, 2)})
    return {"days": days, "total_gdd": round(sum(day["gdd"] for day in days), 2), "missing_dates": []}

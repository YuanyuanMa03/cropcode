#!/usr/bin/env python3
"""CropMath calculator CLI — invoked by CropCode to verify formula computations.

Usage:
    python calc.py <formula_id> param1=value1 param2=value2 ...

Example:
    python calc.py RG_FPAR k=0.5 LAI=3.0
    python calc.py CH4_TI Q10=2.5 t_soil=28
"""
from __future__ import annotations

import sys
import os

# Add CropMath source to path
CROPMATH_SRC = "/Volumes/SamsungT7/cropmath/src"
if CROPMATH_SRC not in sys.path:
    sys.path.insert(0, CROPMATH_SRC)

try:
    from cropmath.formulas import FORMULA_BY_ID
except ImportError:
    print(f"ERROR: Cannot import CropMath from {CROPMATH_SRC}", file=sys.stderr)
    print("Ensure CropMath is installed at /Volumes/SamsungT7/cropmath", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: calc.py <formula_id> [param=value ...]", file=sys.stderr)
        print(f"\nAvailable formulas ({len(FORMULA_BY_ID)}):", file=sys.stderr)
        for fid in sorted(FORMULA_BY_ID):
            f = FORMULA_BY_ID[fid]
            print(f"  {fid:20s}  {f.name}  ({f.name_en})", file=sys.stderr)
        sys.exit(1)

    formula_id = sys.argv[1].upper()
    if formula_id not in FORMULA_BY_ID:
        print(f"ERROR: Unknown formula '{formula_id}'", file=sys.stderr)
        # Suggest close matches
        matches = [fid for fid in FORMULA_BY_ID if formula_id in fid]
        if matches:
            print(f"Did you mean: {', '.join(matches[:5])}?", file=sys.stderr)
        sys.exit(1)

    spec = FORMULA_BY_ID[formula_id]

    # Parse parameters
    params: dict[str, float] = {}
    for arg in sys.argv[2:]:
        if "=" not in arg:
            print(f"ERROR: Invalid parameter format '{arg}' (expected name=value)", file=sys.stderr)
            sys.exit(1)
        name, val_str = arg.split("=", 1)
        try:
            params[name.strip()] = float(val_str)
        except ValueError:
            print(f"ERROR: Cannot parse '{val_str}' as float for parameter '{name}'", file=sys.stderr)
            sys.exit(1)

    # Check for missing parameters
    param_names = [p.name for p in spec.parameters]
    missing = [n for n in param_names if n not in params]
    if missing:
        print(f"ERROR: Missing parameters: {', '.join(missing)}", file=sys.stderr)
        print(f"Required: {', '.join(param_names)}", file=sys.stderr)
        sys.exit(1)

    # Calculate
    try:
        result = spec.calculate(params)
    except Exception as e:
        print(f"ERROR: Calculation failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Output
    print(f"formula: {spec.id}")
    print(f"name: {spec.name} ({spec.name_en})")
    print(f"expression: {spec.expression}")
    print(f"unit: {spec.unit}")
    print(f"result: {result:.{spec.precision}f}")
    print(f"answer_label: {spec.answer_label}")


if __name__ == "__main__":
    main()

# CropCode Agent benchmark v1

Two isolated crop-model data/code repair tasks. The same prompt and fixture are copied to four fresh workspaces: CropCode 1.1.0 CLI/Desktop and CropCode 2.0.0 CLI/Desktop. Agents do not receive `grade.py`.

Each task scores 100 points: nine independent hidden behavior checks worth 10 points each, and 10 points if the original CSV bytes are unchanged. A failed or timed-out agent run is still graded from its final filesystem state. Duration and token counts are descriptive only.

Run `python3 grade.py TASK WORKSPACE` for machine-readable grading. No model is used by the grader. The fixtures and rubric must be frozen before the first agent run.

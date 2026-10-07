"""Runnable verification for detector threshold tuning and PR curve artifacts."""

import json
from pathlib import Path


def test_detector_threshold_artifacts():
    json_path = Path("artifacts/eval/detector_threshold.json")
    png_path = Path("artifacts/eval/detector_pr_curve.png")

    assert json_path.exists(), "detector_threshold.json missing"
    assert png_path.exists(), "detector_pr_curve.png missing"
    assert png_path.stat().st_size > 10_000, "detector_pr_curve.png is empty or too small"

    with open(json_path) as f:
        data = json.load(f)

    # Check required keys
    assert "tuning_criteria" in data
    assert "before_vs_after_temporal_features" in data
    assert "validation_metrics" in data
    assert "test_comparison_all_hours" in data
    assert "operating_points" in data
    assert "uncertain_band" in data

    val = data["validation_metrics"]
    test_comp = data["test_comparison_all_hours"]
    uncertain = data["uncertain_band"]
    ops = data["operating_points"]

    # Operating points structure
    assert "p_030" in ops
    assert "p_040" in ops
    assert "p_050" in ops
    assert "cost_optimal" in ops

    # Validation criteria satisfaction
    assert val["precision"] >= 0.40, f"Validation precision {val['precision']} < 0.40"
    assert val["chosen_threshold"] > 0.05 and val["chosen_threshold"] < 0.95

    # Test metrics check
    default_m = test_comp["default_argmax"]
    tuned_m = test_comp["tuned_threshold"]
    assert tuned_m["f1"] >= default_m["f1"], "Tuned F1 should be at least default argmax F1"
    assert tuned_m["tp"] >= default_m["tp"], "Tuned threshold should capture at least as many TPs"

    # Uncertain band sanity checks
    assert uncertain["hours_per_agent_week"] > 0
    assert uncertain["recall_if_confirmed"] > tuned_m["recall"]
    assert uncertain["recall_uplift_absolute"] > 0
    assert "qualification" in uncertain

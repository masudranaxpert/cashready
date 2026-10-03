import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd

from cashready import simulate
from cashready.features import build_panel
from cashready import detector, recovery, forecast, business_sim, export


def main():
    print("== 1/7 simulate ==")
    simulate.main()
    print("== 2/7 panel ==")
    panel = build_panel()
    panel.to_parquet("data/processed/panel.parquet", index=False)
    print("== 3/7 detector ==")
    det = detector.run(panel)
    print(det)
    print("== 4/7 recovery ==")
    rec = recovery.recover(panel)
    print(rec)
    print("== 5/7 forecast ==")
    fc = forecast.rolling_forecast(panel)
    print(fc)
    print("== 6/7 business sim ==")
    fcdf = pd.read_parquet("data/processed/forecasts.parquet")
    bs = business_sim.simulate_business(panel, fcdf)
    print(bs)
    print("== 7/7 export ==")
    export.export()
    print("PIPELINE DONE")


if __name__ == "__main__":
    main()

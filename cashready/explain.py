"""P7 — SHAP explanations -> top-3 Bangla reasons -> serving artifacts.

LLM never produces numbers: reasons come from SHAP on the forecast model,
messages from deterministic Bangla templates (docs/API_SCHEMA.md contract).
"""

import numpy as np
import pandas as pd

from cashready import config

EPOCH = pd.Timestamp("2026-07-05")

LABELS_BN = {
    "salary_window": ("মাসের বেতনের সময়", "এই সময়ে টাকা তোলার চাপ বাড়ে"),
    "eid_window": ("ঈদের ধাক্কা", "ঈদের ছুটিতে নগদ তোলা অনেক বাড়ে"),
    "haat_day": ("আজ হাটবার", "হাটের দিনে এলাকায় লেনদেন বেশি হয়"),
    "weekday": ("সাপ্তাহিক ধরন", "সপ্তাহের এই দিনে চাহিদা আলাদা হয়"),
    "hour": ("দিনের এই সময়", "দিনের এই সময়ে লেনদেন ঘনত্ব বেশি"),
    "out_mean_7d": ("গত সপ্তাহের ধরন", "গত সপ্তাহে আপনার লেনদেন বেশি ছিল"),
    "out_mean_28d": ("গত মাসের ধরন", "গত মাসের গড় চাহিদা বেশি"),
    "nbr_out_amt": ("পাশের এলাকার চাপ", "আশপাশের এজেন্টদের চাহিদা বাড়ছে"),
    "nbr_z_out": ("এলাকার চাপ বেশি", "আপনার এলাকায় চাহিদা স্বাভাবিকের চেয়ে বেশি"),
    "fail_count": ("সাম্প্রতিক ব্যর্থতা", "সম্প্রতি কিছু লেনদেন ব্যর্থ হয়েছে"),
    "payment": ("ডিজিটালে সরে যাওয়া", "কিছু ক্রেতা ডিজিটাল পেমেন্টে যাচ্ছেন"),
    "out_amt_lag1": ("গতকালের চাহিদা", "গতকাল বেশি টাকা তোলা হয়েছিল"),
    "out_vel_3h": ("সাম্প্রতিক গতি", "শেষ কয়েক ঘণ্টায় চাহিদা দ্রুত বাড়ছে"),
    "is_new": ("নতুন এজেন্ট", "নতুন এজেন্ট — ইতিহাস কম, সতর্ক পরিকল্পনা দরকার"),
    "day_of_month": ("মাসের তারিখ", "মাসের এই সময়ে চাহিদা বদলায়"),
    "cash_in_amt": ("ক্যাশ-ইন প্রবণতা", "ক্যাশ-ইনের ধরন পরিকল্পনায় প্রভাব রাখে"),
}


def top_reasons(shap_row: pd.Series, k=3):
    idx = shap_row.abs().sort_values(ascending=False).head(k).index
    out = []
    for f in idx:
        key = f.split("_mean")[0].split("_lag")[0].split("_z")[0]
        label, why = LABELS_BN.get(f, LABELS_BN.get(key, ("অন্যান্য", "অবদান রয়েছে")))
        out.append({"key": f, "label_bn": label, "impact": float(shap_row[f])})
    return out


def message_bn(opening_cash: int, risk_hour: int, reasons) -> str:
    r1 = reasons[0]["label_bn"] if reasons else "স্বাভাবিক চাহিদা"
    r2 = reasons[1]["label_bn"] if len(reasons) > 1 else ""
    base = (f"আজ সকালে {opening_cash:,} টাকা নগদ রাখুন। "
            f"সবচেয়ে ঝুঁকির সময় বিকেল {risk_hour}টা-এর পর। "
            f"কারণ: {r1}")
    if r2:
        base += f", {r2}"
    return base


def explain_agents(model, X: pd.DataFrame) -> pd.DataFrame:
    """SHAP values for the agent-day rows used in the plan."""
    import shap
    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(X, check_additivity=False)
    if isinstance(sv, list):        # older shap returns list per class
        sv = sv[0]
    return pd.DataFrame(sv, columns=X.columns, index=X.index)


def day_label(day_idx: int) -> str:
    return (EPOCH + pd.Timedelta(days=int(day_idx))).date().isoformat()

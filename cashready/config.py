"""Central configuration. ALL numbers, seeds and cost assumptions live here.
Train = days 1-60, test = days 61-90 (0-indexed: train days 0-59).
"""

SEED = 42

# ---- Scale ---------------------------------------------------------------
N_AGENTS = 300
N_AREAS = 12
N_DAYS = 90                # days 0..89; train = 0..59, test = 60..89
TRAIN_DAYS = (0, 60)       # [start, end) — used by every model stage
TEST_DAYS = (60, 90)

AREA_TYPES = ["urban_market", "peri_urban", "rural"]
AREA_TYPE_WEIGHTS = [0.25, 0.35, 0.40]

# ---- Opening hours -------------------------------------------------------
OPEN_HOUR = 8      # inclusive
CLOSE_HOUR = 22    # exclusive -> 12 open hours per day

# ---- Demand: hourly arrival rates (Poisson lambda) per area_type ---------
BASE_LAM = {                 # (cash_out, cash_in, send_money)
    "urban_market": (2.2, 1.2, 0.30),
    "peri_urban":   (1.6, 0.9, 0.25),
    "rural":        (1.0, 0.55, 0.20),
}

# ---- Amounts: lognormal, clipped to [50, 30000] BDT ----------------------
AMOUNT_MIN, AMOUNT_MAX = 50.0, 30000.0
AMOUNT_MU = {"cash_out": 6.9, "cash_in": 6.6, "send_money": 6.5}   # ~1000 / ~750 / ~665
AMOUNT_SIGMA = {"cash_out": 0.9, "cash_in": 0.9, "send_money": 0.8}

# ---- Calendar effects (multipliers) --------------------------------------
WEEKDAY_MULT = {0: 1.0, 1: 1.0, 2: 1.0, 3: 1.1, 4: 1.05, 5: 1.15, 6: 0.9}  # Mon..Sun (Thu=3)
SALARY_DAYS = (1, 2)          # day-of-month; cash_out x1.4
SALARY_MULT_OUT = 1.4
REMITTANCE_EVERY_DAYS = 7     # per-agent weekly remittance day; cash_in x1.3
REMITTANCE_MULT_IN = 1.3
REMIT_PROB = 0.85             # chance the remittance actually arrives that day
REMIT_AMT_MU = 9.2            # ~10,000 BDT single big cash-in
REMIT_AMT_SIGMA = 0.5
EID_DAYS = (60, 65)           # day indices [60, 65): the big stress test
EID_MULT_OUT = (1.3, 1.5, 1.5, 1.3, 1.2)
EID_MULT_IN = 1.3
HAAT_MULT = {"urban_market": 1.10, "peri_urban": 1.25, "rural": 1.35}  # area's haat weekday

# ---- Liquidity mechanics -------------------------------------------------
INITIAL_CASH = 60_000.0
INITIAL_FLOAT = 60_000.0
OPEN_BUFFER = 1.05            # cash habit opening = trailing-7d mean need x buffer
FLOAT_BUFFER = 0.85           # float opening = trailing-7d cash-in need x buffer (tight!)
HABIT_WINDOW_DAYS = 7
WARMUP_DAYS = 14              # days 0-13: agents use fixed initial buffers
DAY_SHOCK = (0.70, 1.50)      # per agent-day demand shock, U(a, b)
REBALANCE_PROB = 0.25         # per depleted hour: agent tops up cash/float
REBALANCE_FRAC = 0.8          # top up to 80% of habit level
REBALANCE_TRIP_COST = 100.0   # assumed travel/time cost per emergency distributor rebalance trip (BDT)
DEPLETE_FRAC = 0.15           # "depleted" = below 15% of day's opening
CLOSURE_PROB = {"urban_market": 0.02, "peri_urban": 0.03, "rural": 0.04}

# ---- Censoring & demand shift -------------------------------------------
NEW_AGENT_COUNT = 15          # 5% cold-start agents, start day in [30, 60]
NEW_AGENT_START = (30, 60)
NEIGHBOR_REROUTE_FRAC = 0.15  # lost cash-out rerouted to same-area neighbours (+1h)
NEIGHBOR_COUNT = 2
DIGITAL_CONV_BASE = {"urban_market": 0.15, "peri_urban": 0.08, "rural": 0.02}
# refused cash-out converts to digital 'payment' with this prob (+ Eid x2 lift)
DEMAND_SHIFT_THRESHOLD = 0.15  # area-week payment-share growth > 15% => demand_shift

# ---- Economics -----------------------------------------------------------
CASHOUT_COMMISSION_RATE = 0.018
CASHIN_COMMISSION_RATE = 0.0025

# ---- Paths ---------------------------------------------------------------
DATA_RAW = "data/raw"
DATA_PROCESSED = "data/processed"
DATA_GROUND = "data/ground_truth"
ARTIFACTS_EVAL = "artifacts/eval"
ARTIFACTS_SERVE = "artifacts/serve"

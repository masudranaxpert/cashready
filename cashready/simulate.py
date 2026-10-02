"""P1 — Synthetic data simulator with HIDDEN ground truth.

Faithful to the roadmap spec: 300 agents, 6-15 areas, 90 days, stock-outs,
closures, digital shift, censored demand. The platform log (data/raw) does
NOT contain refused cash-outs — that is exactly the censoring we later recover.

Outputs
-------
data/raw/agents.parquet
data/raw/transactions.parquet          (the ONLY thing models may see)
data/ground_truth/events.parquet       (stock-out events, evaluation only)
data/ground_truth/hourly_truth.parquet (true vs observed vs lost, evaluation only)
data/ground_truth/agent_truth.parquet  (per-agent summary, evaluation only)
"""

import time
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config

TX_TYPES = ("cash_out", "cash_in", "send_money")
HOUR_MULT = np.array([0.8, 0.9, 1.0, 1.2, 1.4, 1.4, 1.2, 1.0, 1.0, 1.2, 1.4, 1.3, 1.1, 0.9])
# index 0 -> hour 8 ... index 13 -> hour 21 (lunch + evening rush peaks)


def _lognormal_amounts(rng, kind, n):
    a = rng.lognormal(config.AMOUNT_MU[kind], config.AMOUNT_SIGMA[kind], n)
    return np.clip(np.round(a / 10.0) * 10.0, config.AMOUNT_MIN, config.AMOUNT_MAX)


def build_areas(rng):
    at = rng.choice(config.AREA_TYPES, config.N_AREAS, p=config.AREA_TYPE_WEIGHTS)
    return pd.DataFrame(
        {
            "area_id": [f"A{i:02d}" for i in range(config.N_AREAS)],
            "area_type": at,
            "haat_day": rng.integers(0, 7, config.N_AREAS),
        }
    )


def build_agents(rng, areas):
    n = config.N_AGENTS
    new_idx = rng.choice(n, config.NEW_AGENT_COUNT, replace=False)
    start = np.zeros(n, dtype=int)
    start[new_idx] = rng.integers(*config.NEW_AGENT_START, len(new_idx))
    # habit scale: agents differ ~x4 in business size, by area type
    at_of_area = dict(zip(areas.area_id, areas.area_type))
    agent_area = rng.choice(areas.area_id, n)
    hab = np.array([
        rng.lognormal(*{
            "urban_market": (np.log(45_000), 0.45),
            "peri_urban": (np.log(30_000), 0.45),
            "rural": (np.log(20_000), 0.50),
        }[at_of_area[a]]) for a in agent_area
    ])
    return pd.DataFrame(
        {
            "agent_id": [f"T{i:04d}" for i in range(n)],
            "area_id": agent_area,
            "is_new": np.isin(np.arange(n), new_idx),
            "start_day": start,
            "habit_scale": hab,
        }
    )


def day_multiplier(day_idx, weekday, day_of_month, haat_day, area_type):
    m = config.WEEKDAY_MULT[weekday]
    if day_of_month in config.SALARY_DAYS:
        m *= config.SALARY_MULT_OUT
    if haat_day == weekday:
        m *= config.HAAT_MULT[area_type]
    if config.EID_DAYS[0] <= day_idx < config.EID_DAYS[1]:
        m *= config.EID_MULT_OUT[day_idx - config.EID_DAYS[0]]
    return m


def simulate(
    n_agents=None, n_days=None, n_areas=None, seed=None, verbose=True
):
    """Run the simulator. Smaller n_* allowed for fast tests; None = config."""
    n_agents = n_agents or config.N_AGENTS
    n_days = n_days or config.N_DAYS
    n_areas = n_areas or config.N_AREAS
    rng = np.random.default_rng(seed if seed is not None else config.SEED)
    t0 = time.time()

    areas = build_areas(rng)
    areas = areas.iloc[:n_areas]
    agents = build_agents(rng, areas)
    agents = agents.iloc[:n_agents]
    at_map = dict(zip(areas.area_id, areas.area_type))
    haat_map = dict(zip(areas.area_id, areas.haat_day))
    area_ids = agents.area_id.to_numpy()
    a_types = np.array([at_map[a] for a in area_ids])
    starts = agents.start_day.to_numpy()
    habit_scale = agents.habit_scale.to_numpy()
    agent_ids = agents.agent_id.to_numpy()

    epoch = pd.Timestamp("2026-07-05")  # a Monday
    base = config.BASE_LAM

    # rolling habit memory (trailing mean of realized daily need)
    last7_out = np.full(n_agents, np.nan)
    last7_in = np.full(n_agents, np.nan)

    tx_agent, tx_area, tx_ts, tx_type, tx_amount, tx_status = [], [], [], [], [], []
    hourly_rows = []
    truth_rows = []
    event_rows = []
    agent_stats = np.zeros((n_agents, 5))  # so_days, cashout_so_h, float_so_h, true_out, lost_out
    txn_counter = 0

    for day in range(n_days):
        date = epoch + pd.Timedelta(days=day)
        weekday, dom = date.weekday(), date.day
        today_out = np.zeros(n_agents)
        today_in = np.zeros(n_agents)

        for ai in range(n_agents):
            if day < starts[ai]:
                continue
            at = a_types[ai]
            closed = rng.random() < config.CLOSURE_PROB[at]
            if config.EID_DAYS[0] <= day < config.EID_DAYS[1]:
                closed = closed and rng.random() < 0.3

            # habit opening (after warm-up): trailing 7d mean x buffer
            if day >= config.WARMUP_DAYS and np.isfinite(last7_out[ai]):
                target_cash = last7_out[ai] * config.OPEN_BUFFER
                target_float = last7_in[ai] * config.FLOAT_BUFFER
            else:
                target_cash = config.INITIAL_CASH * habit_scale[ai] / 30_000
                target_float = config.INITIAL_FLOAT * habit_scale[ai] / 30_000
            noise = rng.uniform(0.8, 1.2)
            cash = target_cash * noise
            flt = target_float * rng.uniform(0.9, 1.1)
            shock = rng.uniform(*config.DAY_SHOCK)

            mult = day_multiplier(day, weekday, dom, haat_map[area_ids[ai]], at) * shock
            dm_out, dm_in, dm_sm = base[at]
            eid_in = (
                config.EID_MULT_IN
                if config.EID_DAYS[0] <= day < config.EID_DAYS[1]
                else 1.0
            )
            digital_conv = config.DIGITAL_CONV_BASE[at]
            if config.EID_DAYS[0] <= day < config.EID_DAYS[1]:
                digital_conv = min(0.9, digital_conv * 2)

            day_states = []
            for hpos, hour in enumerate(range(config.OPEN_HOUR, config.CLOSE_HOUR)):
                state = "normal"
                if closed:
                    state = "closed"
                    hourly_rows.append(
                        (agent_ids[ai], area_ids[ai], at, day, hour, 0, 0.0, 0, 0.0, 0, 0, 0)
                    )
                    truth_rows.append(
                        (agent_ids[ai], day, hour, 0, 0.0, 0, 0.0, 0, 0.0, state)
                    )
                    day_states.append(state)
                    continue

                lam_out = dm_out * mult * HOUR_MULT[hpos]
                lam_in = dm_in * mult * eid_in * HOUR_MULT[hpos]
                lam_sm = dm_sm * HOUR_MULT[hpos]
                n_out = rng.poisson(lam_out)
                n_in = rng.poisson(lam_in)
                n_sm = rng.poisson(lam_sm)

                true_cnt, true_amt = n_out, 0.0
                lost_cnt, lost_amt = 0, 0.0
                ff_cnt, ff_amt = 0, 0.0
                obs_out_cnt = obs_out_amt = 0.0
                obs_in_cnt = obs_in_amt = 0.0
                pay_cnt = 0
                ts0 = date + pd.Timedelta(hours=int(hour))

                # ---- cash-out: censor against available cash ----
                if n_out:
                    amts = _lognormal_amounts(rng, "cash_out", n_out)
                    true_amt = float(amts.sum())
                    # serve customers in arrival order until cash runs out
                    k = int(np.searchsorted(np.cumsum(amts), cash, side="right"))
                    k = min(k, n_out)
                    for j in range(n_out):
                        a = amts[j]
                        if j < k:
                            cash -= a
                            flt += a
                            obs_out_cnt += 1
                            obs_out_amt += a
                            today_out[ai] += a
                            tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                            tx_ts.append(ts0); tx_type.append("cash_out")
                            tx_amount.append(a); tx_status.append("success")
                            txn_counter += 1
                        else:
                            lost_cnt += 1; lost_amt += a
                            r = rng.random()
                            if r < digital_conv:
                                tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                                tx_ts.append(ts0); tx_type.append("payment")
                                tx_amount.append(a); tx_status.append("success")
                                pay_cnt += 1
                                txn_counter += 1

                # ---- cash-in: needs float; failures ARE logged ----
                # remittance: one big cash-in that often FAILS on tight float
                remit_arrives = (
                    (day - starts[ai]) % config.REMITTANCE_EVERY_DAYS == (ai % 7)
                    and rng.random() < config.REMIT_PROB
                    and not closed
                )
                if remit_arrives:
                    ra = float(np.clip(rng.lognormal(
                        config.REMIT_AMT_MU, config.REMIT_AMT_SIGMA), 500, 50_000))
                    if flt >= ra:
                        flt -= ra
                        cash += ra
                        obs_in_cnt += 1
                        obs_in_amt += ra
                        today_in[ai] += ra
                        tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                        tx_ts.append(ts0); tx_type.append("cash_in")
                        tx_amount.append(ra); tx_status.append("success")
                    else:
                        tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                        tx_ts.append(ts0); tx_type.append("cash_in")
                        tx_amount.append(ra)
                        tx_status.append("failed_insufficient_float")
                        ff_cnt += 1; ff_amt += ra
                    txn_counter += 1

                if n_in:
                    amts = _lognormal_amounts(rng, "cash_in", n_in)
                    for a in amts:
                        if flt >= a:
                            flt -= a
                            cash += a
                            obs_in_cnt += 1
                            obs_in_amt += a
                            today_in[ai] += a
                            tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                            tx_ts.append(ts0); tx_type.append("cash_in")
                            tx_amount.append(a); tx_status.append("success")
                        else:
                            tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                            tx_ts.append(ts0); tx_type.append("cash_in")
                            tx_amount.append(a); tx_status.append("failed_insufficient_float")
                            ff_cnt += 1; ff_amt += a
                        txn_counter += 1

                # ---- digital send-money (platform noise, agent-less) ----
                if n_sm:
                    amts = _lognormal_amounts(rng, "send_money", n_sm)
                    for a in amts:
                        tx_agent.append(agent_ids[ai]); tx_area.append(area_ids[ai])
                        tx_ts.append(ts0); tx_type.append("send_money")
                        tx_amount.append(a); tx_status.append("success")
                    txn_counter += n_sm
                    pay_cnt += n_sm

                if lost_cnt > 0:
                    state = "cash_stockout"
                elif ff_cnt > 0:
                    state = "float_stockout"
                if state == "cash_stockout":
                    agent_stats[ai, 1] += 1
                elif state == "float_stockout":
                    agent_stats[ai, 2] += 1

                hourly_rows.append(
                    (agent_ids[ai], area_ids[ai], at, day, int(hour),
                     int(obs_out_cnt), float(obs_out_amt), int(obs_in_cnt),
                     float(obs_in_amt), int(pay_cnt), int(n_sm), 1)
                )
                truth_rows.append(
                    (agent_ids[ai], day, int(hour), int(true_cnt), float(true_amt),
                     int(lost_cnt), float(lost_amt), int(ff_cnt), float(ff_amt), state)
                )
                if state != "normal":
                    event_rows.append((agent_ids[ai], day, int(hour), state))
                day_states.append(state)

            # ---- evening habit memory update ----
            today_out_val = today_out[ai]
            today_in_val = today_in[ai]
            if not np.isfinite(last7_out[ai]):
                last7_out[ai] = today_out_val
                last7_in[ai] = today_in_val
            else:
                last7_out[ai] = 6 / 7 * last7_out[ai] + today_out_val / 7
                last7_in[ai] = 6 / 7 * last7_in[ai] + today_in_val / 7

        if verbose and day % 15 == 0:
            print(f"  day {day:3d}/{n_days}  txns so far {txn_counter:>9,}  "
                  f"({time.time()-t0:5.1f}s)")

    # ---- assemble frames ----
    hourly = pd.DataFrame(
        hourly_rows,
        columns=["agent_id", "area_id", "area_type", "day_idx", "hour",
                 "cash_out_count", "cash_out_amount", "cash_in_count",
                 "cash_in_amount", "payment_count", "send_money_count", "open"],
    )
    truth = pd.DataFrame(
        truth_rows,
        columns=["agent_id", "day_idx", "hour", "true_cashout_demand_count",
                 "true_cashout_demand_amount", "lost_cashout_count",
                 "lost_cashout_amount", "float_fail_count", "float_fail_amount",
                 "state"],
    )
    # censoring check: hourly observed must be joinable 1:1 with truth
    panel = hourly.merge(truth, on=["agent_id", "day_idx", "hour"], how="outer")
    assert panel[["cash_out_count", "true_cashout_demand_count"]].notna().all().all()
    assert (
        (panel.cash_out_count <= panel.true_cashout_demand_count + 1e-9).all()
    ), "observed exceeds true demand — censoring broken"

    events = pd.DataFrame(
        event_rows, columns=["agent_id", "day_idx", "hour", "event"]
    )
    agents_out = agents.copy()
    agents_out["stockout_days"] = [
        events[(events.agent_id == a) & (events.event == "cash_stockout")]
        .day_idx.nunique() for a in agents.agent_id
    ]
    idx = {a: i for i, a in enumerate(agent_ids)}
    agents_out["cash_stockout_hours"] = [agent_stats[idx[a], 1] for a in agents.agent_id]
    agents_out["float_stockout_hours"] = [agent_stats[idx[a], 2] for a in agents.agent_id]
    # per-agent true/lost from truth frame (vectorized)
    g = truth.groupby("agent_id")[["true_cashout_demand_count", "lost_cashout_count"]].sum()
    agents_out["true_demand_count"] = agents_out.agent_id.map(
        g.true_cashout_demand_count
    ).fillna(0).astype(int)
    agents_out["lost_demand_count"] = agents_out.agent_id.map(
        g.lost_cashout_count
    ).fillna(0).astype(int)

    txns = pd.DataFrame(
        {
            "txn_id": np.arange(len(tx_agent)),
            "agent_id": tx_agent,
            "area_id": tx_area,
            "ts": pd.to_datetime(tx_ts),
            "type": tx_type,
            "amount": tx_amount,
            "status": tx_status,
        }
    )
    return areas, agents_out, hourly, truth, events, txns


def main(n_agents=None, n_days=None, n_areas=None, seed=None, write=True):
    areas, agents, hourly, truth, events, txns = simulate(n_agents, n_days, n_areas, seed)
    if write:
        for p in (config.DATA_RAW, config.DATA_GROUND):
            Path(p).mkdir(parents=True, exist_ok=True)
        areas.to_parquet("data/raw/areas.parquet", index=False)
        agents.to_parquet("data/raw/agents.parquet", index=False)
        txns.to_parquet("data/raw/transactions.parquet", index=False)
        truth.to_parquet("data/ground_truth/hourly_truth.parquet", index=False)
        events.to_parquet("data/ground_truth/events.parquet", index=False)
        agents.to_parquet("data/ground_truth/agent_truth.parquet", index=False)

    summary(areas, agents, hourly, truth, txns)
    return areas, agents, hourly, truth, events, txns


def summary(areas, agents, hourly, truth, txns):
    n = len(txns)
    so = (truth.state == "cash_stockout").sum()
    fs = (truth.state == "float_stockout").sum()
    cl = (truth.state == "closed").sum()
    true_cnt = truth.true_cashout_demand_count.sum()
    lost_cnt = truth.lost_cashout_count.sum()
    print("\n===== SIMULATOR SUMMARY =====")
    print(f"agents {len(agents)}  areas {len(areas)}  agent-hours {len(hourly):,}")
    print(f"transactions {n:,}  (cash_out {(txns.type=='cash_out').sum():,}, "
          f"cash_in {(txns.type=='cash_in').sum():,}, "
          f"send_money {(txns.type=='send_money').sum():,}, "
          f"payment {(txns.type=='payment').sum():,})")
    print(f"cash stock-out agent-hours {so:,} ({100*so/len(truth):.1f}%)  "
          f"float stock-out {fs:,} ({100*fs/len(truth):.1f}%)  closed {cl:,}")
    print(f"TRUE cash-out demand {true_cnt:,} txns; lost {lost_cnt:,} "
          f"({100*lost_cnt/max(true_cnt,1):.1f}%) — censoring OK")
    ns = agents[agents.is_new]
    print(f"new agents {agents.is_new.sum()} with stock-out days "
          f"{(ns.stockout_days > 0).mean()*100:.0f}%")
    if agents.stockout_days.max() > 0:
        print(f"agents with >=1 stock-out day: "
              f"{(agents.stockout_days > 0).mean()*100:.0f}%")


if __name__ == "__main__":
    main()

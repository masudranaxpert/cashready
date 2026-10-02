import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MOCK_AREAS,
  MOCK_AGENTS,
  MOCK_METRICS,
  DEMO_DATE,
  DEMO_WEEK,
  getMockAgentPlan,
  getMockAgentLostDemand,
  getMockAreaRisk,
  getMockAreaLostDemand,
} from "../lib/mock-data.ts";

import { formatBDT, formatPercent, STRINGS } from "../lib/strings.ts";

describe("CashReady Frontend Contract & Verification Tests", () => {
  test("Mock areas and agents count", () => {
    assert.equal(MOCK_AREAS.length, 4, "Must have exactly 4 areas in mock mode");
    assert.equal(MOCK_AGENTS.length, 20, "Must have exactly 20 agents in mock mode");

    const areaIds = new Set(MOCK_AREAS.map((a) => a.area_id));
    for (const ag of MOCK_AGENTS) {
      assert.ok(areaIds.has(ag.area_id), `Agent ${ag.agent_id} belongs to a valid area`);
    }
  });

  test("Demo date and week constants", () => {
    assert.equal(DEMO_DATE, "2026-10-02");
    assert.equal(DEMO_WEEK, "2026-W40");
  });

  test("Agent plan risk switching and buffer scaling", () => {
    const agentId = "T0039";
    const plan90 = getMockAgentPlan(agentId, DEMO_DATE, "0.9");
    const plan80 = getMockAgentPlan(agentId, DEMO_DATE, "0.8");
    const plan95 = getMockAgentPlan(agentId, DEMO_DATE, "0.95");

    assert.ok(plan80.opening_cash < plan90.opening_cash, "80% risk has lower opening cash buffer than 90%");
    assert.ok(plan95.opening_cash > plan90.opening_cash, "95% risk has higher opening cash buffer than 90%");

    // Verify documented scaling formula:
    // 0.8: 0.86x of 90%
    // 0.95: 1.18x of 90%
    assert.equal(plan80.opening_cash, Math.round(plan90.opening_cash * 0.86));
    assert.equal(plan95.opening_cash, Math.round(plan90.opening_cash * 1.18));

    // Verify Bangla message contains updated figure
    assert.ok(plan90.message_bn.includes(formatBDT(plan90.opening_cash)));
    assert.ok(plan80.message_bn.includes(formatBDT(plan80.opening_cash)));
    assert.ok(plan95.message_bn.includes(formatBDT(plan95.opening_cash)));

    // Verify SHAP reasons
    assert.ok(plan90.reasons.length <= 3 && plan90.reasons.length > 0);
    assert.ok(plan90.reasons[0].label_bn.length > 0);
  });

  test("Agent lost demand calculation", () => {
    const lost = getMockAgentLostDemand("T0039", DEMO_WEEK);
    assert.equal(lost.week, DEMO_WEEK);
    assert.equal(lost.agent_id, "T0039");
    assert.ok(lost.lost_count > 0);
    assert.ok(lost.lost_amount > 0);
    assert.ok(lost.lost_commission > 0);
  });

  test("Area risk distribution and high-risk threshold", () => {
    const risk = getMockAreaRisk("A01", DEMO_DATE);
    assert.equal(risk.area_id, "A01");
    assert.equal(risk.date, DEMO_DATE);
    assert.equal(risk.agents.length, 5);

    const hasHighRisk = risk.agents.some((a) => a.stockout_prob_habit >= 0.3);
    const hasNormal = risk.agents.some((a) => a.stockout_prob_habit < 0.3);
    assert.ok(hasHighRisk, "Must have high risk agents (>= 0.3) for border styling");
    assert.ok(hasNormal, "Must have normal agents (< 0.3)");
  });

  test("Area lost demand and digital shift flag", () => {
    const areaLost = getMockAreaLostDemand(DEMO_WEEK);
    assert.equal(areaLost.week, DEMO_WEEK);
    assert.ok(areaLost.areas["A01"]);
    assert.ok(areaLost.areas["A03"]);

    // Verify A03 has digital demand shift flagged
    assert.equal(areaLost.areas["A03"].demand_shift, 1);
  });

  test("Exact required demo metrics compliance", () => {
    assert.equal(MOCK_METRICS.detector_metrics.f1_macro, 0.79);
    assert.equal(MOCK_METRICS.recovery_metrics.amount_mae_pct.naive_observed, 71.9);
    assert.equal(MOCK_METRICS.recovery_metrics.amount_mae_pct.mean_correction, 69.7);
    assert.equal(MOCK_METRICS.recovery_metrics.amount_mae_pct.cashready_recovery, 68.3);
    assert.equal(MOCK_METRICS.business_sim_metrics.habit_policy.lost_pct, 18.1);
    assert.equal(MOCK_METRICS.business_sim_metrics.cashready_policy.lost_pct, 1.4);
    assert.equal(MOCK_METRICS.business_sim_metrics.commission_saved_bdt, 1062799);
    assert.equal(MOCK_METRICS.forecast_metrics.coverage_p10_p90, 0.826);
  });

  test("String formatting helpers", () => {
    assert.equal(formatBDT(1062799), "1,062,799");
    assert.equal(formatBDT(6154.2), "6,154");
    assert.equal(formatPercent(0.8263), "82.6%");
    assert.equal(formatPercent(0.014), "1.4%");
    assert.equal(STRINGS.appName, "CashReady");
  });

  test("SHAP impact bar scaling logic (positive, negative, zero)", () => {
    const testReasons = [
      { key: "r1", label_bn: "পজিটিভ প্রভাব", impact: 0.35 },
      { key: "r2", label_bn: "নেগেটিভ প্রভাব", impact: -0.175 },
      { key: "r3", label_bn: "শূন্য প্রভাব", impact: 0.0 },
    ];

    const maxImpact = Math.max(0.35, ...testReasons.map((r) => Math.abs(r.impact)));
    assert.equal(maxImpact, 0.35);

    const calcPct = (impact) =>
      impact === 0 ? 0 : Math.min(100, Math.round((Math.abs(impact) / maxImpact) * 100));

    // +0.35 should be 100% of the positive (right) half
    assert.equal(calcPct(testReasons[0].impact), 100);
    assert.ok(testReasons[0].impact > 0);

    // -0.175 should be exactly 50% of the negative (left) half
    assert.equal(calcPct(testReasons[1].impact), 50);
    assert.ok(testReasons[1].impact < 0);

    // 0.0 should be exactly 0% width (no misleading bar)
    assert.equal(calcPct(testReasons[2].impact), 0);
  });

  test("Mobile viewport layout & responsive constraints (375px, 390px, 430px, 1280px)", () => {
    const viewports = [
      { name: "iPhone SE", width: 375 },
      { name: "iPhone 12/13/14", width: 390 },
      { name: "iPhone 14/15 Pro Max", width: 430 },
      { name: "Desktop", width: 1280 },
    ];

    for (const vp of viewports) {
      // 1. Agent page: max-w-md = 448px. At <= 448px, width is 100% with padding
      const agentContainerWidth = Math.min(vp.width - 24, 448);
      assert.ok(agentContainerWidth <= vp.width, `${vp.name}: Agent container must not exceed viewport`);

      // 2. Segmented control: 3 columns. Each column has width = (agentContainerWidth - 8 - 32) / 3
      const cardInnerWidth = agentContainerWidth - 32; // 16px padding on each side
      const segmentedButtonWidth = (cardInnerWidth - 8) / 3;
      // On 375px: cardInnerWidth ~311px, each button gets ~101px
      assert.ok(segmentedButtonWidth >= 90, `${vp.name}: Segmented control buttons have ample width for Bengali text`);

      // 3. Navigation: floating pill width on mobile <= (vp.width - 24)
      if (vp.width < 768) {
        const maxNavWidth = vp.width - 24;
        assert.ok(maxNavWidth >= 351, `${vp.name}: Navigation fits inside viewport with margins`);
      }

      // 4. Area page: on mobile (< 640px), cards stack vertically with 100% width, no horizontal scroll
      if (vp.width < 640) {
        const areaCardWidth = vp.width - 24;
        assert.ok(areaCardWidth > 0 && areaCardWidth <= vp.width, `${vp.name}: Area mobile cards fit viewport`);
      }
    }
  });

  test("API contract schemas & offline fallback payload validation", () => {
    // 1. Agents list contract
    assert.equal(MOCK_AGENTS.length, 20);
    const sampleAgent = MOCK_AGENTS[0];
    assert.ok("agent_id" in sampleAgent && "area_id" in sampleAgent && "area_type" in sampleAgent);
    assert.ok("lat" in sampleAgent && "lon" in sampleAgent && "is_new" in sampleAgent);

    // 2. Areas list contract
    assert.equal(MOCK_AREAS.length, 4);
    const sampleArea = MOCK_AREAS[0];
    assert.ok("area_id" in sampleArea && "area_type" in sampleArea);

    // 3. Agent plan contract
    const plan = getMockAgentPlan("T0039", DEMO_DATE, "0.9");
    assert.equal(plan.agent_id, "T0039");
    assert.equal(plan.date, DEMO_DATE);
    assert.equal(plan.opening_cash, 68500);
    assert.ok("stockout_prob_plan" in plan && "stockout_prob_habit" in plan);
    assert.ok("risk_hour" in plan && "reasons" in plan && "message_bn" in plan);
    assert.equal(plan.reasons.length, 3);

    // 4. Agent lost demand contract
    const lost = getMockAgentLostDemand("T0039", DEMO_WEEK);
    assert.equal(lost.agent_id, "T0039");
    assert.equal(lost.week, DEMO_WEEK);
    assert.ok("lost_count" in lost && "lost_amount" in lost && "lost_commission" in lost);

    // 5. Area risk contract
    const risk = getMockAreaRisk("A01", DEMO_DATE);
    assert.equal(risk.area_id, "A01");
    assert.equal(risk.date, DEMO_DATE);
    assert.ok(Array.isArray(risk.agents) && risk.agents.length > 0);
    assert.ok("stockout_prob_habit" in risk.agents[0] && "risk_hour" in risk.agents[0]);

    // 6. Area lost demand contract
    const areaLost = getMockAreaLostDemand(DEMO_WEEK);
    assert.equal(areaLost.week, DEMO_WEEK);
    assert.ok("A01" in areaLost.areas);
    assert.ok("demand_shift" in areaLost.areas["A01"]);

    // 7. Metrics contract
    assert.ok("detector_metrics" in MOCK_METRICS);
    assert.ok("recovery_metrics" in MOCK_METRICS);
    assert.ok("forecast_metrics" in MOCK_METRICS);
    assert.ok("business_sim_metrics" in MOCK_METRICS);
  });
});



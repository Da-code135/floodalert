import { describe, expect, it } from "vitest";
import { createSeedState } from "@/data/seed";
import {
  computeDivisionRisks,
  computeMetrics,
  median,
  riskLevelFromScore,
  severityBreakdown,
  topHazards,
} from "@/lib/risk";

const NOW = Date.parse("2026-10-25T14:00:00.000Z");

describe("risk model", () => {
  it("maps thresholds to levels", () => {
    expect(riskLevelFromScore(10)).toBe("Low");
    expect(riskLevelFromScore(64)).toBe("Elevated");
    expect(riskLevelFromScore(76)).toBe("High");
    expect(riskLevelFromScore(88)).toBe("Severe");
    expect(riskLevelFromScore(100)).toBe("Severe");
  });

  it("computes all five divisions, sorted and bounded", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    expect(risks).toHaveLength(5);
    expect(risks[0].score).toBeGreaterThanOrEqual(
      risks[risks.length - 1].score,
    );
    for (const risk of risks) {
      expect(risk.score).toBeGreaterThanOrEqual(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(risk.peopleAtRisk).toBeGreaterThan(0);
    }
  });

  it("keeps Kawempe among the highest-risk divisions in the seed scenario", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    expect(risks.slice(0, 2).map((risk) => risk.division)).toContain(
      "Kawempe",
    );
  });

  it("builds metrics from reports and alerts", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    const metrics = computeMetrics(state.reports, state.alerts, risks, NOW);
    expect(metrics.reports24h).toBeGreaterThan(0);
    expect(metrics.reach).toBeGreaterThan(0);
    expect(metrics.verifiedRate).toBeGreaterThan(0);
    expect(metrics.funnel.dispatched).toBeGreaterThan(0);
    expect(metrics.responseSeconds).toBeGreaterThan(0);
  });

  it("computes the median for odd and even arrays", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(3);
    expect(median([])).toBe(0);
  });

  it("counts severity and hazards", () => {
    const state = createSeedState(NOW);
    const severity = severityBreakdown(state.reports);
    expect(
      severity.critical + severity.severe + severity.moderate + severity.low,
    ).toBe(state.reports.length);
    const hazards = topHazards(state.reports);
    expect(hazards.length).toBeGreaterThan(0);
    expect(hazards[0].count).toBeGreaterThanOrEqual(
      hazards[hazards.length - 1].count,
    );
  });
});

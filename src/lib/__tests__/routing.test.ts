import { describe, expect, it } from "vitest";
import { createSeedState } from "@/data/seed";
import { computeDivisionRisks } from "@/lib/risk";
import { computeNodeRisks, findRoutes } from "@/lib/routing";

const NOW = Date.parse("2026-10-25T14:00:00.000Z");

describe("safe routing", () => {
  it("computes node risk in a bounded range", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    const nodeRisks = computeNodeRisks(risks);
    for (const score of Object.values(nodeRisks)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("returns two connected routes for Bwaise to the city centre", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    const comparison = findRoutes("bwaise", "central", risks);
    expect(comparison).not.toBeNull();
    expect(comparison!.safest.path[0].id).toBe("bwaise");
    expect(comparison!.safest.path.at(-1)?.id).toBe("central");
    expect(comparison!.fastest.path[0].id).toBe("bwaise");
    expect(comparison!.safest.minutes).toBeGreaterThan(0);
    expect(comparison!.fastest.minutes).toBeGreaterThan(0);
  });

  it("returns null when origin and destination match", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    expect(findRoutes("central", "central", risks)).toBeNull();
  });

  it("can route across the city with all nodes exposed", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW).map((risk) => ({
      ...risk,
      score: 100,
    }));
    const comparison = findRoutes("luzira", "nateete", risks);
    expect(comparison).not.toBeNull();
    expect(comparison!.fastest.minutes).toBeGreaterThan(0);
  });

  it("never returns a path with a repeated node", () => {
    const state = createSeedState(NOW);
    const risks = computeDivisionRisks(state.reports, NOW);
    const comparison = findRoutes("kanyanya", "kabalagala", risks);
    expect(comparison).not.toBeNull();
    const ids = comparison!.safest.path.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

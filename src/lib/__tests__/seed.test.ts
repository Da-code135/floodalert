import { describe, expect, it } from "vitest";
import { createSeedState } from "@/data/seed";

const NOW = Date.parse("2026-10-25T14:00:00.000Z");

describe("seed state", () => {
  it("creates a complete, unique demo data set", () => {
    const state = createSeedState(NOW);
    expect(state.version).toBe(2);
    expect(state.reports).toHaveLength(17);
    expect(state.alerts).toHaveLength(6);
    expect(state.circles.length).toBeGreaterThan(8);

    const reportIds = new Set(state.reports.map((report) => report.id));
    expect(reportIds.size).toBe(state.reports.length);
    const alertIds = new Set(state.alerts.map((alert) => alert.id));
    expect(alertIds.size).toBe(state.alerts.length);
  });

  it("keeps every timestamp in the past relative to the demo clock", () => {
    const state = createSeedState(NOW);
    for (const report of state.reports) {
      expect(Date.parse(report.createdAt)).toBeLessThanOrEqual(NOW);
      expect(Date.parse(report.updatedAt)).toBeLessThanOrEqual(NOW);
    }
    for (const alert of state.alerts) {
      expect(Date.parse(alert.sentAt)).toBeLessThanOrEqual(NOW);
    }
  });

  it("links alerts back to reports and keeps bilingual text", () => {
    const state = createSeedState(NOW);
    const reportIds = new Set(state.reports.map((report) => report.id));
    for (const alert of state.alerts) {
      expect(alert.messageEn.length).toBeGreaterThan(20);
      expect(alert.messageLg.length).toBeGreaterThan(20);
      expect(alert.reach).toBeGreaterThan(0);
      if (alert.reportId) expect(reportIds.has(alert.reportId)).toBe(true);
    }
  });

  it("places every report inside the Kampala map bounds", () => {
    const state = createSeedState(NOW);
    for (const report of state.reports) {
      expect(report.lat).toBeGreaterThan(0.24);
      expect(report.lat).toBeLessThan(0.41);
      expect(report.lng).toBeGreaterThan(32.5);
      expect(report.lng).toBeLessThan(32.67);
    }
  });
});

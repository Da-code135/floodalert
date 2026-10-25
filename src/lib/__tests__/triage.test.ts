import { describe, expect, it } from "vitest";
import {
  deriveSeverity,
  edgeTriage,
  hazardLabel,
  normalizeHazards,
} from "@/lib/triage";
import type { TriageInput } from "@/lib/types";

const base: TriageInput = {
  area: "Bwaise II",
  division: "Kawempe",
  landmark: "Bwaise Market",
  depthCm: 10,
  hazards: [],
  description: "",
};

describe("deriveSeverity", () => {
  it("treats 60 cm as critical", () => {
    expect(deriveSeverity({ ...base, depthCm: 60 })).toBe("critical");
  });

  it("treats knee-deep water as severe", () => {
    expect(deriveSeverity({ ...base, depthCm: 35 })).toBe("severe");
  });

  it("treats ankle-deep water as moderate", () => {
    expect(deriveSeverity({ ...base, depthCm: 12 })).toBe("moderate");
  });

  it("is low for dry, hazard-free reports", () => {
    expect(deriveSeverity({ ...base, depthCm: 0 })).toBe("low");
  });

  it("escalates a downed power line", () => {
    expect(
      deriveSeverity({ ...base, depthCm: 5, hazards: ["power-line"] }),
    ).toBe("critical");
  });

  it("escalates trapped people even in shallow water", () => {
    expect(
      deriveSeverity({
        ...base,
        depthCm: 5,
        description: "Two children are stranded by the wall",
      }),
    ).toBe("critical");
  });
});

describe("edgeTriage", () => {
  it("returns a complete triage object", () => {
    const result = edgeTriage({
      ...base,
      depthCm: 48,
      hazards: ["fast-water", "open-drain", "trapped-people"],
      description: "Water is above the boda stage and two children are stranded.",
    });

    expect(result.engine).toBe("edge");
    expect(result.severity).toBe("critical");
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.confidence).toBeLessThanOrEqual(0.88);
    expect(result.actions.length).toBeGreaterThanOrEqual(4);
    expect(result.actions.length).toBeLessThanOrEqual(5);
    expect(result.alertEn).toContain("Bwaise II");
    expect(result.alertEn).toContain("999");
    expect(result.alertLg).toContain("999");
    expect(result.escalate).toBe(true);
  });

  it("carries the fallback reason through", () => {
    const result = edgeTriage(base, { fallbackReason: "offline" });
    expect(result.fallbackReason).toBe("offline");
  });

  it("normalizes hazard identifiers to labels", () => {
    expect(normalizeHazards(["open-drain", "Open drain", "sewage"])).toEqual([
      "Open drain",
      "Sewage overflow",
    ]);
    expect(hazardLabel("unknown-hazard")).toBe("unknown-hazard");
  });

  it("does not add a power-line action unless selected", () => {
    const result = edgeTriage({ ...base, depthCm: 20 });
    expect(result.actions.join(" ")).not.toContain("UEDCL");
  });
});

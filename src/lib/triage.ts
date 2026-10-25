import { HAZARD_OPTIONS, HOTSPOTS } from "@/data/kampala";
import type {
  DivisionName,
  Severity,
  TriageInput,
  TriageResult,
} from "@/lib/types";

export const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  moderate: 1,
  severe: 2,
  critical: 3,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  moderate: "Moderate",
  severe: "Severe",
  critical: "Critical",
};

const TRAPPED_RE =
  /trapped|stranded|swept|cut off|cannot move|can't move|stuck inside/i;
const VULNERABLE_RE =
  /child|children|elderly|pregnant|disabled|wheelchair|school|hospital|clinic/i;

export function hazardLabel(hazard: string): string {
  return (
    HAZARD_OPTIONS.find((option) => option.id === hazard)?.label ?? hazard
  );
}

export function normalizeHazards(hazards: string[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const hazard of hazards) {
    const label = hazardLabel(hazard);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}

function escalateHazard(hazards: string[]): boolean {
  return hazards.some((hazard) => {
    const option = HAZARD_OPTIONS.find(
      (candidate) =>
        candidate.id === hazard || candidate.label === hazard,
    );
    return option?.escalate ?? false;
  });
}

export function deriveSeverity(
  input: Pick<
    TriageInput,
    "depthCm" | "hazards" | "description" | "area" | "landmark"
  >,
): Severity {
  const hazards = normalizeHazards(input.hazards);
  const text = `${input.description} ${input.area} ${input.landmark}`;
  const trapped =
    TRAPPED_RE.test(text) ||
    hazards.includes("People trapped") ||
    hazards.includes("Downed power line");
  const vulnerable = VULNERABLE_RE.test(text);
  const fastWater = hazards.includes("Fast-moving water");
  const deep = input.depthCm;

  if (trapped || deep >= 60) return "critical";
  if (deep >= 30 || (fastWater && deep >= 20)) return "severe";
  if (deep >= 10 || hazards.length >= 1 || vulnerable) return "moderate";
  return "low";
}

function shortAction(
  severity: Severity,
  hazards: string[],
  escalate: boolean,
): string {
  if (hazards.includes("Downed power line")) {
    return "Stay 10 m from downed wires.";
  }
  if (hazards.includes("People trapped") || escalate) {
    return "Call 999 and keep clear for responders.";
  }
  if (hazards.includes("Fast-moving water")) {
    return "Do not cross fast water.";
  }
  if (severity === "critical") {
    return "Move to higher ground now.";
  }
  if (severity === "severe") {
    return "Avoid the road and move to higher ground.";
  }
  return "Avoid low-lying roads and drains.";
}

function buildActions(
  severity: Severity,
  hazards: string[],
  escalate: boolean,
): string[] {
  const actions = new Set<string>();

  if (escalate) {
    actions.add(
      "Call 999 and the KCCA emergency desk on 0800 990 000 — give the exact landmark.",
    );
  }
  actions.add("Move to higher ground and stay out of floodwater.");

  if (hazards.includes("Fast-moving water")) {
    actions.add(
      "Do not try to cross fast-moving water — 15 cm can knock an adult off their feet.",
    );
  }
  if (hazards.includes("Open drain")) {
    actions.add(
      "Keep children away from open drains; covers may be missing under the water.",
    );
  }
  if (hazards.includes("Downed power line")) {
    actions.add(
      "Stay at least 10 m from downed power lines and call UEDCL on 0800 203 088.",
    );
  }
  if (hazards.includes("Sewage overflow")) {
    actions.add(
      "Treat floodwater as contaminated. Boil drinking water and wash hands with soap.",
    );
  }
  if (hazards.includes("Vehicle stuck")) {
    actions.add(
      "Do not drive into water. If a vehicle stalls, get out and move to higher ground.",
    );
  }
  if (hazards.includes("School route blocked")) {
    actions.add(
      "Tell the school and keep children on the higher side of the road.",
    );
  }
  if (hazards.includes("Hospital access blocked")) {
    actions.add(
      "Alert the nearest health facility and ask responders to use the alternate access road.",
    );
  }
  if (hazards.includes("People trapped")) {
    actions.add(
      "Tell responders how many people are trapped and the safest way in.",
    );
  }
  if (actions.size < 4) {
    actions.add("Share this alert with neighbours who may not receive SMS.");
  }
  if (severity === "critical") {
    actions.add("Keep a phone line free for responders and avoid re-entering the area.");
  }
  return Array.from(actions).slice(0, 5);
}

function buildSummary(
  input: TriageInput,
  severity: Severity,
  hazards: string[],
  escalate: boolean,
): string {
  const hazardText =
    hazards.length > 0
      ? `Reported hazards: ${hazards.join(", ").toLowerCase()}.`
      : "No specific hazard was selected.";
  const depthText =
    input.depthCm > 0
      ? `${input.depthCm} cm of water`
      : "Flooding with no depth estimate";
  const closing = escalate
    ? "Escalate to the KCCA rapid-response desk and the nearest Red Cross monitor."
    : severity === "low"
      ? "Log for trend analysis; verification is optional unless conditions worsen."
      : "A community monitor should verify within 15 minutes.";
  return `${depthText} reported near ${input.landmark} in ${input.area} (${input.division}). ${hazardText} ${closing}`;
}

function buildHeadline(
  input: TriageInput,
  severity: Severity,
  hazards: string[],
): string {
  if (hazards.includes("People trapped")) {
    return `People trapped in ${input.area} floodwater`;
  }
  if (hazards.includes("Downed power line")) {
    return `Live power line down in ${input.area}`;
  }
  if (severity === "critical") {
    return `Critical ${input.depthCm} cm flooding in ${input.area}`;
  }
  if (severity === "severe") {
    return `Severe flooding at ${input.landmark}`;
  }
  if (severity === "moderate") {
    return `Flooding reported in ${input.area}`;
  }
  return `Standing water in ${input.area}`;
}

function buildAlerts(
  input: TriageInput,
  severity: Severity,
  hazards: string[],
  escalate: boolean,
): { alertEn: string; alertLg: string } {
  const action = shortAction(severity, hazards, escalate);
  const severityWord =
    severity === "critical"
      ? "CRITICAL"
      : severity === "severe"
        ? "SEVERE"
        : "FLOOD";

  const alertEn = `${severityWord} FLOOD ALERT — ${input.area}, ${input.division}: ${input.depthCm} cm of water near ${input.landmark}. ${action} Avoid the area. Emergency: 999.`;

  const powerLine = hazards.includes("Downed power line")
    ? " Temukwata waya z'amasanyalaze."
    : "";
  const alertLg = `LABULA Y'AMAZZI — ${input.area}, ${input.division}: amazzi gaakulukira ku ${input.landmark} (cm ${input.depthCm}). Mwewale ekifo kino, mutuuke waggulu era temuyita mu mazzi.${powerLine} Ssimu y'akabenje: 999.`;

  return { alertEn, alertLg };
}

/**
 * Deterministic on-device model used when Gemini is unavailable or the device
 * is offline. It is intentionally transparent: severity is a function of depth,
 * hazards and keywords, not a claim of computer vision.
 */
export function edgeTriage(
  input: TriageInput,
  options: { fallbackReason?: string } = {},
): TriageResult {
  const hazards = normalizeHazards(input.hazards);
  const severity = deriveSeverity(input);
  const escalate =
    severity === "critical" ||
    escalateHazard(input.hazards) ||
    (hazards.includes("Hospital access blocked") && input.depthCm >= 20);

  const signalCount =
    hazards.length +
    (input.description.trim().length > 60 ? 1 : 0) +
    (input.depthCm > 0 ? 1 : 0);
  const confidence = Math.min(
    0.88,
    0.62 + signalCount * 0.035 + (severity === "critical" ? 0.04 : 0),
  );

  const { alertEn, alertLg } = buildAlerts(
    input,
    severity,
    hazards,
    escalate,
  );

  return {
    engine: "edge",
    severity,
    confidence: Math.round(confidence * 100) / 100,
    headline: buildHeadline(input, severity, hazards),
    summary: buildSummary(input, severity, hazards, escalate),
    hazards,
    actions: buildActions(severity, hazards, escalate),
    alertEn,
    alertLg,
    escalate,
    fallbackReason: options.fallbackReason,
  };
}

export function nearestHotspot(lat: number, lng: number, division: DivisionName) {
  const candidates = HOTSPOTS.filter(
    (hotspot) => hotspot.division === division,
  );
  let best = candidates[0] ?? HOTSPOTS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const hotspot of candidates) {
    const distance = (hotspot.lat - lat) ** 2 + (hotspot.lng - lng) ** 2;
    if (distance < bestDistance) {
      best = hotspot;
      bestDistance = distance;
    }
  }
  return best;
}

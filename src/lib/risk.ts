import {
  DIVISIONS,
  RAINFALL_24H_MM,
  RAINFALL_FORECAST_MM,
  RAINFALL_PAST_MM,
  SUBSCRIBER_CIRCLES,
} from "@/data/kampala";
import { SEVERITY_RANK } from "@/lib/triage";
import type {
  AlertRecord,
  DivisionName,
  DivisionRisk,
  FloodReport,
  Severity,
} from "@/lib/types";

const HOUR = 60 * 60 * 1000;

export function riskLevelFromScore(
  score: number,
): "Low" | "Elevated" | "High" | "Severe" {
  if (score >= 88) return "Severe";
  if (score >= 76) return "High";
  if (score >= 64) return "Elevated";
  return "Low";
}

export function riskColor(score: number): string {
  if (score >= 88) return "#FF6B6B";
  if (score >= 76) return "#FFB454";
  if (score >= 64) return "#5EEAD4";
  return "#3EE0FF";
}

export function computeDivisionRisks(
  reports: FloodReport[],
  now = Date.now(),
): DivisionRisk[] {
  const recent = reports.filter(
    (report) => now - Date.parse(report.createdAt) <= 24 * HOUR,
  );

  return DIVISIONS.map((division) => {
    const divisionReports = recent.filter(
      (report) => report.division === division.name,
    );

    let pressure = 0;
    for (const report of divisionReports) {
      const ageHours = (now - Date.parse(report.createdAt)) / HOUR;
      const recency =
        ageHours <= 3 ? 1 : ageHours <= 6 ? 0.65 : ageHours <= 12 ? 0.35 : 0.15;
      pressure += (SEVERITY_RANK[report.severity] + 1) * recency;
    }

    const rainComponent = Math.min(RAINFALL_24H_MM / 80, 1) * 35;
    const pressureComponent = Math.min(pressure / 10, 1) * 30;
    const vulnerabilityComponent = (division.vulnerability / 100) * 20;
    const drainageComponent =
      ((100 - division.drainageCoverage) / 100) * 15;

    const score = Math.round(
      Math.min(
        100,
        rainComponent +
          pressureComponent +
          vulnerabilityComponent +
          drainageComponent,
      ),
    );

    const peopleAtRisk = Math.round(
      division.population *
        (division.vulnerability / 100) *
        0.18 *
        (score / 100),
    );

    const last6 = RAINFALL_PAST_MM.slice(-6).reduce(
      (sum, value) => sum + value,
      0,
    );
    const next6 = RAINFALL_FORECAST_MM.reduce(
      (sum, value) => sum + value,
      0,
    );
    const trend = Math.round(
      ((next6 - last6) / Math.max(last6, 1)) * 100 +
        divisionReports.filter(
          (report) => now - Date.parse(report.createdAt) <= 2 * HOUR,
        ).length *
          2,
    );

    return {
      division: division.name,
      score,
      level: riskLevelFromScore(score),
      reports: divisionReports.length,
      peopleAtRisk,
      rainfall24h: RAINFALL_24H_MM,
      trend,
    };
  }).sort((a, b) => b.score - a.score);
}

export function overallRisk(risks: DivisionRisk[]): number {
  if (risks.length === 0) return 0;
  const population = new Map(
    DIVISIONS.map((division) => [division.name, division.population]),
  );
  const weighted = risks.reduce(
    (sum, risk) => sum + risk.score * (population.get(risk.division) ?? 1),
    0,
  );
  const total = risks.reduce(
    (sum, risk) => sum + (population.get(risk.division) ?? 1),
    0,
  );
  return Math.round(weighted / Math.max(total, 1));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function computeResponseSeconds(
  alerts: AlertRecord[],
  reports: FloodReport[],
): number {
  const byId = new Map(reports.map((report) => [report.id, report]));
  const durations = alerts
    .filter((alert) => alert.reportId && byId.has(alert.reportId))
    .map((alert) => {
      const report = byId.get(alert.reportId!);
      if (!report) return 0;
      const seconds =
        (Date.parse(alert.sentAt) - Date.parse(report.createdAt)) / 1000;
      return seconds > 0 && seconds < 3600 ? seconds : 0;
    })
    .filter((value) => value > 0);
  return durations.length > 0 ? median(durations) : 0;
}

export function computeMetrics(
  reports: FloodReport[],
  alerts: AlertRecord[],
  risks: DivisionRisk[],
  now = Date.now(),
) {
  const reports24h = reports.filter(
    (report) => now - Date.parse(report.createdAt) <= 24 * HOUR,
  );
  const verified = reports24h.filter(
    (report) => report.status !== "unverified",
  ).length;
  const dispatched = reports24h.filter(
    (report) => report.status === "responding" || report.status === "resolved",
  ).length;
  const resolved = reports24h.filter(
    (report) => report.status === "resolved",
  ).length;
  const alerts24h = alerts.filter(
    (alert) => now - Date.parse(alert.sentAt) <= 24 * HOUR,
  );
  const reach = alerts24h.reduce((sum, alert) => sum + alert.reach, 0);
  const responseSeconds = computeResponseSeconds(alerts, reports);
  const peopleAtRisk = risks.reduce(
    (sum, risk) => sum + risk.peopleAtRisk,
    0,
  );
  const subscribers = SUBSCRIBER_CIRCLES.reduce(
    (sum, circle) => sum + circle.members,
    0,
  );
  const critical = reports24h.filter(
    (report) => report.severity === "critical",
  ).length;
  const verifiedRate =
    reports24h.length > 0
      ? Math.round((verified / reports24h.length) * 100)
      : 0;

  return {
    reports24h: reports24h.length,
    reach,
    subscribers,
    peopleAtRisk,
    responseSeconds,
    verifiedRate,
    verified,
    dispatched,
    resolved,
    critical,
    alerts24h: alerts24h.length,
    coverage: risks.filter((risk) => risk.reports > 0).length,
    divisions: risks.length,
    funnel: {
      reported: reports24h.length,
      verified,
      dispatched,
      resolved,
    },
  };
}

export function countByDivision(
  reports: FloodReport[],
): Record<DivisionName, number> {
  const counts = Object.fromEntries(
    DIVISIONS.map((division) => [division.name, 0]),
  ) as Record<DivisionName, number>;
  for (const report of reports) {
    counts[report.division] += 1;
  }
  return counts;
}

export function severityBreakdown(
  reports: FloodReport[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    low: 0,
    moderate: 0,
    severe: 0,
    critical: 0,
  };
  for (const report of reports) {
    counts[report.severity] += 1;
  }
  return counts;
}

export function topHazards(
  reports: FloodReport[],
  limit = 5,
): { hazard: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    for (const hazard of report.ai.hazards ?? []) {
      counts.set(hazard, (counts.get(hazard) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([hazard, count]) => ({ hazard, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function reportsByHour(
  reports: FloodReport[],
  hours = 12,
  now = Date.now(),
): { hour: number; count: number; label: string }[] {
  return Array.from({ length: hours }, (_, index) => {
    const end = now - (hours - 1 - index) * HOUR;
    const start = end - HOUR;
    const count = reports.filter((report) => {
      const time = Date.parse(report.createdAt);
      return time > start && time <= end;
    }).length;
    return {
      hour: index,
      count,
      label: new Date(end).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Kampala",
      }),
    };
  });
}

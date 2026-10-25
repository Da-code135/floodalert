export type DivisionName =
  | "Kampala Central"
  | "Kawempe"
  | "Lubaga"
  | "Makindye"
  | "Nakawa";

export type Severity = "low" | "moderate" | "severe" | "critical";

export type ReportStatus = "unverified" | "verified" | "responding" | "resolved";

export type ReportSource = "app" | "sms" | "ussd" | "volunteer";

export type SeverityFilter = Severity | "all";

export interface Division {
  name: DivisionName;
  slug: string;
  population: number;
  /** Share of households within 200m of a drainage channel, 0-100. */
  drainageCoverage: number;
  /** Structural vulnerability index, 0-100. */
  vulnerability: number;
  elevationM: number;
  color: string;
}

export interface Hotspot {
  id: string;
  area: string;
  division: DivisionName;
  lat: number;
  lng: number;
  /** 0-100: higher means more exposed to flash flooding. */
  exposure: number;
  /** 0-100: higher means better drains / less standing water. */
  drainage: number;
  elevationM: number;
  households: number;
  note: string;
}

export interface FloodReport {
  id: string;
  area: string;
  division: DivisionName;
  landmark: string;
  lat: number;
  lng: number;
  depthCm: number;
  hazards: string[];
  description: string;
  photo?: string;
  severity: Severity;
  confidence: number;
  source: ReportSource;
  status: ReportStatus;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  ai: {
    engine: "gemini" | "edge";
    model?: string;
    headline: string;
    summary: string;
    actions: string[];
    hazards: string[];
    alertEn: string;
    alertLg: string;
    escalate: boolean;
    latencyMs?: number;
  };
}

export interface AlertRecord {
  id: string;
  division: DivisionName | "All divisions";
  area?: string;
  severity: Severity;
  title: string;
  messageEn: string;
  messageLg: string;
  channels: AlertChannel[];
  reach: number;
  sentAt: string;
  status: "delivered" | "sending" | "partial";
  reportId?: string;
}

export type AlertChannel = "SMS" | "WhatsApp" | "App push" | "Radio script";

export interface SubscriberCircle {
  id: string;
  name: string;
  division: DivisionName | "All divisions";
  members: number;
  contact: string;
  languages: string[];
}

export interface SafeRouteNode {
  id: string;
  label: string;
  division: DivisionName;
  lat: number;
  lng: number;
  risk: number;
}

export interface SafeRouteEdge {
  from: string;
  to: string;
  road: string;
  minutes: number;
  /** Extra minutes added by water on the road, 0-30. */
  floodPenalty: number;
}

export interface RouteResult {
  path: SafeRouteNode[];
  edges: SafeRouteEdge[];
  minutes: number;
  risk: number;
  warnings: string[];
  safe: boolean;
}

export interface RouteOption extends RouteResult {
  kind: "safest" | "fastest";
  penalty: number;
}

export interface RouteComparison {
  safest: RouteOption;
  fastest: RouteOption;
}

export interface TriageInput {
  area: string;
  division: DivisionName;
  landmark: string;
  depthCm: number;
  hazards: string[];
  description: string;
  image?: {
    mimeType: string;
    data: string;
  };
}

export interface TriageResult {
  engine: "gemini" | "edge";
  model?: string;
  severity: Severity;
  confidence: number;
  headline: string;
  summary: string;
  hazards: string[];
  actions: string[];
  alertEn: string;
  alertLg: string;
  escalate: boolean;
  latencyMs?: number;
  fallbackReason?: string;
}

export interface AppState {
  version: number;
  seededAt: string;
  reports: FloodReport[];
  alerts: AlertRecord[];
  circles: SubscriberCircle[];
}

export interface DivisionRisk {
  division: DivisionName;
  score: number;
  level: "Low" | "Elevated" | "High" | "Severe";
  reports: number;
  peopleAtRisk: number;
  rainfall24h: number;
  trend: number;
}

import { SUBSCRIBER_CIRCLES, HOTSPOTS } from "@/data/kampala";
import { edgeTriage } from "@/lib/triage";
import type {
  AlertChannel,
  AlertRecord,
  AppState,
  DivisionName,
  FloodReport,
  ReportSource,
  ReportStatus,
  Severity,
  TriageInput,
} from "@/lib/types";

const MINUTE = 60 * 1000;

type SeedReportMeta = {
  id: string;
  minutesAgo: number;
  source: ReportSource;
  status: ReportStatus;
  reporter: string;
  photo?: string;
  engine?: "gemini" | "edge";
  latencyMs?: number;
  headline?: string;
  summary?: string;
  severity?: Severity;
  confidence?: number;
  escalate?: boolean;
};

function isoMinutesAgo(minutes: number, now: number): string {
  return new Date(now - minutes * MINUTE).toISOString();
}

function buildReport(
  input: TriageInput,
  meta: SeedReportMeta,
  now: number,
): FloodReport {
  const triage = edgeTriage(input);
  const createdAt = isoMinutesAgo(meta.minutesAgo, now);
  const updatedAt = isoMinutesAgo(
    Math.max(0, meta.minutesAgo - 2),
    now,
  );
  const idNumber = Number(meta.id.replace(/\D/g, "")) || 0;
  const hotspot =
    HOTSPOTS.find((candidate) => candidate.area === input.area) ??
    HOTSPOTS[0];

  return {
    id: meta.id,
    area: input.area,
    division: input.division,
    landmark: input.landmark,
    lat: Number(
      (hotspot.lat + ((idNumber % 5) - 2) * 0.0007).toFixed(5),
    ),
    lng: Number(
      (hotspot.lng + ((idNumber % 7) - 3) * 0.0007).toFixed(5),
    ),
    depthCm: input.depthCm,
    hazards: input.hazards,
    description: input.description,
    photo: meta.photo,
    severity: meta.severity ?? triage.severity,
    confidence: meta.confidence ?? triage.confidence,
    source: meta.source,
    status: meta.status,
    reporter: meta.reporter,
    createdAt,
    updatedAt,
    ai: {
      engine: meta.engine ?? "gemini",
      model:
        (meta.engine ?? "gemini") === "gemini"
          ? "gemini-2.5-flash"
          : undefined,
      headline: meta.headline ?? triage.headline,
      summary: meta.summary ?? triage.summary,
      actions: triage.actions,
      hazards: triage.hazards,
      alertEn: triage.alertEn,
      alertLg: triage.alertLg,
      escalate: meta.escalate ?? triage.escalate,
      latencyMs: meta.latencyMs,
    },
  };
}

function buildAlert(args: {
  id: string;
  division: DivisionName | "All divisions";
  area?: string;
  severity: Severity;
  title: string;
  messageEn: string;
  messageLg: string;
  channels: AlertChannel[];
  reach: number;
  sentMinutesAgo: number;
  reportId?: string;
  now: number;
}): AlertRecord {
  return {
    id: args.id,
    division: args.division,
    area: args.area,
    severity: args.severity,
    title: args.title,
    messageEn: args.messageEn,
    messageLg: args.messageLg,
    channels: args.channels,
    reach: args.reach,
    sentAt: isoMinutesAgo(args.sentMinutesAgo, args.now),
    status: "delivered",
    reportId: args.reportId,
  };
}

export function createSeedState(now = Date.now()): AppState {
  const reports: FloodReport[] = [
    buildReport(
      {
        area: "Bwaise II",
        division: "Kawempe",
        landmark: "Bwaise Market, Bombo Road",
        depthCm: 48,
        hazards: [
          "fast-water",
          "open-drain",
          "sewage",
          "trapped-people",
        ],
        description:
          "Water is above the boda stage and entering shops. Two children are stranded beside the market wall. Motorcycles are still forcing their way through.",
      },
      {
        id: "FL-1042",
        minutesAgo: 12,
        source: "app",
        status: "responding",
        reporter: "Amina K. · Market vendor",
        photo: "/demo/flood-1.jpg",
        latencyMs: 2_140,
        headline: "Two children stranded as Bwaise market floods",
        summary:
          "Fast-moving water is above the boda stage and entering shops at Bwaise Market. Two children are stranded beside the market wall. The photo shows a submerged road with motorcycles still crossing — treat this as a life-safety incident.",
        severity: "critical",
        confidence: 0.94,
        escalate: true,
      },
      now,
    ),
    buildReport(
      {
        area: "Kisenyi",
        division: "Kampala Central",
        landmark: "Kisenyi Market, gate 3",
        depthCm: 22,
        hazards: ["open-drain"],
        description:
          "Water is entering stalls at gate 3. Traders are moving bags of maize onto tables. The drain outside the gate looks blocked.",
      },
      {
        id: "FL-1041",
        minutesAgo: 27,
        source: "sms",
        status: "unverified",
        reporter: "SMS shortcode · +256 ••• 482",
        engine: "edge",
        confidence: 0.74,
        headline: "Market gate 3 taking water",
        summary:
          "Shallow water is entering stalls at Kisenyi Market gate 3 and traders are lifting stock. The drain appears blocked. An SMS reporter did not attach a photo, so a monitor should verify.",
        photo: "/demo/flood-5.jpg",
      },
      now,
    ),
    buildReport(
      {
        area: "Ndeeba",
        division: "Lubaga",
        landmark: "Ndeeba trading centre, Nakivubo channel",
        depthCm: 72,
        hazards: ["trapped-people", "sewage", "fast-water"],
        description:
          "Waist-deep water around the shops. One household is cut off behind the channel. There is a strong sewage smell and the water is moving quickly.",
      },
      {
        id: "FL-1040",
        minutesAgo: 41,
        source: "app",
        status: "responding",
        reporter: "Moses O. · Boda rider",
        photo: "/demo/flood-4.jpg",
        latencyMs: 2_780,
        headline: "Homes under 70 cm of water in Ndeeba",
        summary:
          "Waist-deep water surrounds homes near Ndeeba trading centre. Residents report sewage mixing with floodwater and at least one household cut off behind the Nakivubo channel. Escalate for evacuation support.",
        severity: "critical",
        confidence: 0.96,
        escalate: true,
      },
      now,
    ),
    buildReport(
      {
        area: "Kinawataka",
        division: "Nakawa",
        landmark: "Kinawataka wetland edge, near the market",
        depthCm: 34,
        hazards: ["sewage", "open-drain"],
        description:
          "Water has entered two shops and is not moving. The drain is blocked and smells strongly of sewage.",
      },
      {
        id: "FL-1039",
        minutesAgo: 55,
        source: "volunteer",
        status: "verified",
        reporter: "Red Cross monitor · Kinawataka",
        latencyMs: 1_960,
        headline: "Sewage-contaminated water at Kinawataka",
        summary:
          "Floodwater is ponding at the wetland edge and has entered two shops. The drain is blocked and the water has a strong sewage smell. Public-health follow-up is recommended.",
      },
      now,
    ),
    buildReport(
      {
        area: "Katwe",
        division: "Makindye",
        landmark: "Katwe Market, northern entrance",
        depthCm: 18,
        hazards: ["open-drain"],
        description:
          "Ankle-deep water at the market entrance. Traders have put down planks. The drain cover is missing.",
      },
      {
        id: "FL-1038",
        minutesAgo: 72,
        source: "app",
        status: "verified",
        reporter: "Sarah N. · Trader",
        latencyMs: 1_720,
      },
      now,
    ),
    buildReport(
      {
        area: "Kanyanya",
        division: "Kawempe",
        landmark: "Kanyanya ring road, near the primary school",
        depthCm: 56,
        hazards: ["fast-water", "school-route"],
        description:
          "Fast water is crossing the ring road on the route used by two primary schools. Children are still trying to cross.",
      },
      {
        id: "FL-1037",
        minutesAgo: 95,
        source: "sms",
        status: "verified",
        reporter: "SMS shortcode · +256 ••• 119",
        engine: "edge",
        confidence: 0.81,
        headline: "Kanyanya school route cut by fast water",
        summary:
          "Fast-moving water is crossing the Kanyanya ring road on the route used by two primary schools. Children are still attempting to cross. Alert the schools and dispatch a monitor.",
      },
      now,
    ),
    buildReport(
      {
        area: "Nateete",
        division: "Lubaga",
        landmark: "Nateete taxi stage",
        depthCm: 14,
        hazards: ["vehicle-stuck"],
        description:
          "One taxi is stuck at the stage and water is rising slowly. Traffic is backing up.",
      },
      {
        id: "FL-1036",
        minutesAgo: 125,
        source: "app",
        status: "resolved",
        reporter: "Brian T. · Driver",
        latencyMs: 1_540,
      },
      now,
    ),
    buildReport(
      {
        area: "Luzira",
        division: "Nakawa",
        landmark: "Port Bell Road, near the landing site",
        depthCm: 38,
        hazards: ["sewage", "open-drain"],
        description:
          "Water is across the road at the landing site. The drainage channel is overflowing and smells bad.",
      },
      {
        id: "FL-1035",
        minutesAgo: 160,
        source: "volunteer",
        status: "responding",
        reporter: "Luzira community monitor",
        latencyMs: 2_050,
      },
      now,
    ),
    buildReport(
      {
        area: "Kisenyi",
        division: "Kampala Central",
        landmark: "Kisenyi Market, gate 1",
        depthCm: 61,
        hazards: ["power-line", "fast-water"],
        description:
          "A power line is down and touching the water near gate 1. People are standing very close. Water is knee-deep and moving.",
      },
      {
        id: "FL-1034",
        minutesAgo: 190,
        source: "app",
        status: "responding",
        reporter: "Hakim S. · Shop owner",
        latencyMs: 2_460,
        headline: "Power line down in Kisenyi floodwater",
        summary:
          "A live power line is reported touching floodwater near Kisenyi Market gate 1, with people standing close by. Escalate immediately to UEDCL and KCCA and keep the area clear.",
        severity: "critical",
        confidence: 0.95,
        escalate: true,
      },
      now,
    ),
    buildReport(
      {
        area: "Kabalagala",
        division: "Makindye",
        landmark: "Kabalagala junction",
        depthCm: 9,
        hazards: ["vehicle-stuck"],
        description:
          "Water is pooling at the junction and one car has stalled. Traffic is slow but moving.",
      },
      {
        id: "FL-1033",
        minutesAgo: 240,
        source: "sms",
        status: "resolved",
        reporter: "SMS shortcode · +256 ••• 771",
        engine: "edge",
      },
      now,
    ),
    buildReport(
      {
        area: "Bwaise III",
        division: "Kawempe",
        landmark: "Bwaise III school route, off Bombo Road",
        depthCm: 78,
        hazards: ["trapped-people", "school-route", "open-drain"],
        description:
          "The school route is impassable and a group of pupils is waiting on the far side. No injuries reported yet.",
      },
      {
        id: "FL-1032",
        minutesAgo: 300,
        source: "volunteer",
        status: "verified",
        reporter: "Grace N. · Teacher",
        latencyMs: 2_210,
        headline: "Bwaise III school route under 78 cm of water",
        summary:
          "The main school route in Bwaise III is impassable and a group of pupils is waiting on the far side. No injuries reported. Keep the children on the higher side and notify the school.",
        severity: "critical",
        confidence: 0.93,
        escalate: true,
      },
      now,
    ),
    buildReport(
      {
        area: "Mulago",
        division: "Kawempe",
        landmark: "Mulago hospital underpass",
        depthCm: 17,
        hazards: ["hospital-access"],
        description:
          "The underpass is flooded and an ambulance is waiting. There is a longer route through Kamwokya.",
      },
      {
        id: "FL-1031",
        minutesAgo: 360,
        source: "app",
        status: "verified",
        reporter: "Dr. A. · Mulago",
        latencyMs: 1_880,
      },
      now,
    ),
    buildReport(
      {
        area: "Bukasa",
        division: "Makindye",
        landmark: "Bukasa Market",
        depthCm: 41,
        hazards: ["open-drain", "sewage"],
        description:
          "Water is knee-deep around the market and the outfall is blocked. Two stalls have collapsed.",
      },
      {
        id: "FL-1030",
        minutesAgo: 420,
        source: "sms",
        status: "verified",
        reporter: "SMS shortcode · +256 ••• 603",
        engine: "edge",
        confidence: 0.79,
      },
      now,
    ),
    buildReport(
      {
        area: "Kawaala",
        division: "Lubaga",
        landmark: "Kawaala trading centre",
        depthCm: 24,
        hazards: ["fast-water"],
        description:
          "Fast runoff from the hill is crossing the road at the trading centre. Boda riders are still passing.",
      },
      {
        id: "FL-1029",
        minutesAgo: 480,
        source: "app",
        status: "resolved",
        reporter: "Joan M. · Resident",
        latencyMs: 1_690,
      },
      now,
    ),
    buildReport(
      {
        area: "Nsambya",
        division: "Makindye",
        landmark: "Nsambya railway crossing",
        depthCm: 12,
        hazards: ["vehicle-stuck"],
        description: "Small car stalled at the crossing. Water is not moving fast.",
      },
      {
        id: "FL-1028",
        minutesAgo: 600,
        source: "ussd",
        status: "resolved",
        reporter: "USSD *247# · anonymous",
        engine: "edge",
      },
      now,
    ),
    buildReport(
      {
        area: "Kyebando",
        division: "Kawempe",
        landmark: "Kyebando junction",
        depthCm: 29,
        hazards: ["open-drain", "school-route"],
        description:
          "The culvert is blocked and water is over the school route. Children are being carried across.",
      },
      {
        id: "FL-1027",
        minutesAgo: 720,
        source: "app",
        status: "verified",
        reporter: "Peter K. · Resident",
        latencyMs: 1_820,
      },
      now,
    ),
    buildReport(
      {
        area: "Bugolobi",
        division: "Nakawa",
        landmark: "Bugolobi underpass",
        depthCm: 6,
        hazards: ["vehicle-stuck"],
        description: "Minor pooling under the bridge. One driver stalled but moved on.",
      },
      {
        id: "FL-1026",
        minutesAgo: 960,
        source: "app",
        status: "resolved",
        reporter: "Anonymous · App",
        latencyMs: 1_510,
      },
      now,
    ),
  ];

  const byId = new Map(reports.map((report) => [report.id, report]));
  const report = (id: string) => byId.get(id)!;

  const alerts: AlertRecord[] = [
    buildAlert({
      id: "AL-9081",
      division: "Kawempe",
      area: "Bwaise II",
      severity: "critical",
      title: "Critical flooding at Bwaise Market",
      messageEn: report("FL-1042").ai.alertEn,
      messageLg: report("FL-1042").ai.alertLg,
      channels: ["SMS", "WhatsApp", "App push"],
      reach: 1_842,
      sentMinutesAgo: 9,
      reportId: "FL-1042",
      now,
    }),
    buildAlert({
      id: "AL-9080",
      division: "Lubaga",
      area: "Ndeeba",
      severity: "critical",
      title: "Ndeeba homes cut off — evacuation support requested",
      messageEn: report("FL-1040").ai.alertEn,
      messageLg: report("FL-1040").ai.alertLg,
      channels: ["SMS", "Radio script"],
      reach: 12_730,
      sentMinutesAgo: 37,
      reportId: "FL-1040",
      now,
    }),
    buildAlert({
      id: "AL-9079",
      division: "Kampala Central",
      area: "Kisenyi",
      severity: "critical",
      title: "Live power line in Kisenyi floodwater",
      messageEn: report("FL-1034").ai.alertEn,
      messageLg: report("FL-1034").ai.alertLg,
      channels: ["SMS", "App push"],
      reach: 532,
      sentMinutesAgo: 186,
      reportId: "FL-1034",
      now,
    }),
    buildAlert({
      id: "AL-9078",
      division: "All divisions",
      severity: "moderate",
      title: "Heavy rain advisory: 26 mm expected in the next 6 hours",
      messageEn:
        "HEAVY RAIN ADVISORY — Kampala: up to 26 mm expected in the next 6 hours. Low-lying areas may flood. Move valuables above floor level and avoid drains. Emergency: 999.",
      messageLg:
        "LABULA Y'ENKUNGU — Kampala: enkungu ezimala mm 26 ziyinza okutonnya mu saawa 6 ezijja. Ebitundu eby'awansi biyinza okujjula amazzi. Muteeke ebintu waggulu era mwewale olukoloboze. Ssimu y'akabenje: 999.",
      channels: ["App push", "Radio script"],
      reach: 15_300,
      sentMinutesAgo: 240,
      now,
    }),
    buildAlert({
      id: "AL-9077",
      division: "Nakawa",
      area: "Kinawataka",
      severity: "severe",
      title: "Sewage-contaminated flooding in Kinawataka",
      messageEn: report("FL-1039").ai.alertEn,
      messageLg: report("FL-1039").ai.alertLg,
      channels: ["SMS", "WhatsApp"],
      reach: 380,
      sentMinutesAgo: 52,
      reportId: "FL-1039",
      now,
    }),
    buildAlert({
      id: "AL-9076",
      division: "Kawempe",
      area: "Kanyanya",
      severity: "severe",
      title: "Kanyanya school route cut by fast water",
      messageEn: report("FL-1037").ai.alertEn,
      messageLg: report("FL-1037").ai.alertLg,
      channels: ["SMS", "Radio script"],
      reach: 11_160,
      sentMinutesAgo: 90,
      reportId: "FL-1037",
      now,
    }),
  ];

  return {
    version: 2,
    seededAt: new Date(now).toISOString(),
    reports,
    alerts,
    circles: SUBSCRIBER_CIRCLES,
  };
}

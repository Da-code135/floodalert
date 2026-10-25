import type { ReportSource, ReportStatus, Severity } from "@/lib/types";

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

const TIME_ZONE = "Africa/Kampala";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(value));
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return formatNumber(value);
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const delta = now - Date.parse(iso);
  if (!Number.isFinite(delta)) return "—";
  const future = delta < 0;
  const minutes = Math.max(1, Math.round(Math.abs(delta) / 60_000));
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) {
    return future
      ? `in ${hours}h${remainder ? ` ${remainder}m` : ""}`
      : `${hours}h${remainder ? ` ${remainder}m` : ""} ago`;
  }
  const days = Math.floor(hours / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDay(iso: string | number = Date.now()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatFullDate(iso: string | number = Date.now()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatUGX(value: number): string {
  return `UGX ${formatNumber(value)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function uid(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `${prefix}-${random.toUpperCase()}`;
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trim()}…`;
}

export const SEVERITY_STYLES: Record<
  Severity,
  {
    label: string;
    hex: string;
    text: string;
    bg: string;
    border: string;
    dot: string;
    ring: string;
  }
> = {
  low: {
    label: "Low",
    hex: "#3EE0FF",
    text: "text-aqua",
    bg: "bg-aqua/10",
    border: "border-aqua/25",
    dot: "bg-aqua",
    ring: "ring-aqua/30",
  },
  moderate: {
    label: "Moderate",
    hex: "#B9F45B",
    text: "text-lime",
    bg: "bg-lime/10",
    border: "border-lime/25",
    dot: "bg-lime",
    ring: "ring-lime/30",
  },
  severe: {
    label: "Severe",
    hex: "#FFC457",
    text: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/30",
    dot: "bg-amber",
    ring: "ring-amber/30",
  },
  critical: {
    label: "Critical",
    hex: "#FF6B6B",
    text: "text-coral",
    bg: "bg-coral/12",
    border: "border-coral/35",
    dot: "bg-coral",
    ring: "ring-coral/40",
  },
};

export const STATUS_STYLES: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  unverified: {
    label: "Unverified",
    className: "border-white/12 bg-white/5 text-mist",
  },
  verified: {
    label: "Verified",
    className: "border-aqua/25 bg-aqua/10 text-aqua",
  },
  responding: {
    label: "Responding",
    className: "border-amber/30 bg-amber/10 text-amber",
  },
  resolved: {
    label: "Resolved",
    className: "border-lime/25 bg-lime/10 text-lime",
  },
};

export const SOURCE_LABEL: Record<ReportSource, string> = {
  app: "FloodAlert app",
  sms: "SMS shortcode",
  ussd: "USSD *247#",
  volunteer: "Community monitor",
};

export const SOURCE_SHORT: Record<ReportSource, string> = {
  app: "App",
  sms: "SMS",
  ussd: "USSD",
  volunteer: "Monitor",
};

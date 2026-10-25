"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  MapPin,
  X,
} from "lucide-react";
import {
  DIVISION_SHAPES,
  HOTSPOTS,
  SAFE_POINTS,
} from "@/data/kampala";
import { cn, formatClock, relativeTime, SEVERITY_STYLES } from "@/lib/format";
import { riskColor, riskLevelFromScore } from "@/lib/risk";
import type {
  DivisionName,
  DivisionRisk,
  FloodReport,
} from "@/lib/types";
import { SeverityBadge } from "@/components/ui/primitives";

const VIEW = { width: 760, height: 570 };
const BOUNDS = {
  minLat: 0.288,
  maxLat: 0.407,
  minLng: 32.505,
  maxLng: 32.675,
};

type Layer = "reports" | "hotspots" | "safePoints";

const LABELS: {
  name: string;
  division: DivisionName;
  lat: number;
  lng: number;
  dx?: number;
  dy?: number;
}[] = [
  {
    name: "KAWEMPE",
    division: "Kawempe",
    lat: 0.366,
    lng: 32.574,
    dy: -4,
  },
  {
    name: "LUBAGA",
    division: "Lubaga",
    lat: 0.31,
    lng: 32.545,
    dy: 4,
  },
  {
    name: "CENTRAL",
    division: "Kampala Central",
    lat: 0.322,
    lng: 32.591,
    dy: -4,
  },
  {
    name: "MAKINDYE",
    division: "Makindye",
    lat: 0.303,
    lng: 32.606,
    dy: 2,
  },
  {
    name: "NAKAWA",
    division: "Nakawa",
    lat: 0.342,
    lng: 32.625,
    dy: -2,
  },
];

const ROADS: [number, number][][] = [
  [
    [0.405, 32.57],
    [0.374, 32.574],
    [0.348, 32.576],
    [0.326, 32.581],
    [0.315, 32.583],
  ],
  [
    [0.315, 32.583],
    [0.323, 32.601],
    [0.329, 32.618],
    [0.334, 32.645],
    [0.336, 32.668],
  ],
  [
    [0.315, 32.583],
    [0.303, 32.578],
    [0.294, 32.558],
    [0.285, 32.542],
    [0.273, 32.522],
  ],
  [
    [0.315, 32.583],
    [0.301, 32.57],
    [0.29, 32.552],
    [0.282, 32.535],
  ],
  [
    [0.374, 32.574],
    [0.386, 32.588],
    [0.401, 32.601],
  ],
];

const NAKIVUBO: [number, number][] = [
  [0.316, 32.565],
  [0.312, 32.579],
  [0.309, 32.596],
  [0.303, 32.612],
  [0.296, 32.633],
  [0.291, 32.652],
];

function project(lat: number, lng: number): [number, number] {
  const x =
    ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) *
    VIEW.width;
  const y =
    ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) *
    VIEW.height;
  return [x, y];
}

function polygonPath(points: [number, number][]): string {
  return points
    .map(([lat, lng], index) => {
      const [x, y] = project(lat, lng);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

function linePath(points: [number, number][]): string {
  return points
    .map(([lat, lng], index) => {
      const [x, y] = project(lat, lng);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function labelPosition(label: (typeof LABELS)[number]): [number, number] {
  return project(label.lat, label.lng);
}

export function KampalaMap({
  risks,
  reports,
  now,
  selectedDivision,
  onSelectDivision,
  onSelectReport,
  className,
  compact = false,
}: {
  risks: DivisionRisk[];
  reports: FloodReport[];
  now: number;
  selectedDivision?: DivisionName | null;
  onSelectDivision?: (division: DivisionName | null) => void;
  onSelectReport?: (report: FloodReport) => void;
  className?: string;
  compact?: boolean;
}) {
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    reports: true,
    hotspots: true,
    safePoints: false,
  });
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(
    null,
  );

  const riskByDivision = useMemo(
    () => new Map(risks.map((risk) => [risk.division, risk])),
    [risks],
  );

  const visibleReports = useMemo(
    () =>
      [...reports]
        .sort(
          (a, b) =>
            severityOrder(b.severity) - severityOrder(a.severity),
        )
        .slice(0, compact ? 10 : 40),
    [reports, compact],
  );

  return (
    <div
      className={cn(
        "relative isolate h-full min-h-[430px] overflow-hidden rounded-2xl border border-line bg-[#071019]",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="h-full w-full"
        role="img"
        aria-label="Live flood risk map of the five Kampala divisions with community reports"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="map-bg" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#0c1c28" />
            <stop offset="68%" stopColor="#08131c" />
            <stop offset="100%" stopColor="#060d14" />
          </radialGradient>
          <pattern
            id="map-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M28 0H0V28"
              fill="none"
              stroke="rgba(148,190,220,0.055)"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id="map-water"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(8)"
          >
            <path
              d="M0 7c3.5 0 3.5-3 7-3s3.5 3 7 3"
              fill="none"
              stroke="rgba(62,224,255,0.12)"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="channel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3EE0FF" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#3EE0FF" stopOpacity="0.5" />
            <stop offset="1" stopColor="#3EE0FF" stopOpacity="0.15" />
          </linearGradient>
          <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={VIEW.width} height={VIEW.height} fill="url(#map-bg)" />
        <rect
          width={VIEW.width}
          height={VIEW.height}
          fill="url(#map-grid)"
          opacity="0.8"
        />

        {/* Radar rings */}
        {(() => {
          const [cx, cy] = project(0.326, 32.588);
          return (
            <g opacity="0.5">
              <circle
                cx={cx}
                cy={cy}
                r="130"
                fill="none"
                stroke="rgba(62,224,255,0.09)"
                strokeWidth="1"
                strokeDasharray="2 8"
              />
              <circle
                cx={cx}
                cy={cy}
                r="230"
                fill="none"
                stroke="rgba(62,224,255,0.06)"
                strokeWidth="1"
                strokeDasharray="2 10"
              />
              <circle cx={cx} cy={cy} r="3" fill="rgba(62,224,255,0.5)" />
            </g>
          );
        })()}

        {/* Main road network */}
        <g>
          {ROADS.map((road, index) => (
            <path
              key={index}
              d={linePath(road)}
              fill="none"
              stroke="rgba(180,210,230,0.13)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ))}
          <path
            d={linePath(NAKIVUBO)}
            fill="none"
            stroke="url(#channel)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Division polygons */}
        <g>
          {(Object.entries(DIVISION_SHAPES) as [DivisionName, [number, number][]][]).map(
            ([division, points]) => {
              const risk = riskByDivision.get(division);
              const score = risk?.score ?? 40;
              const color = riskColor(score);
              const selected = selectedDivision === division;
              const dimmed = Boolean(selectedDivision) && !selected;
              return (
                <path
                  key={division}
                  d={polygonPath(points)}
                  fill={color}
                  fillOpacity={
                    dimmed ? 0.03 : selected ? 0.2 : 0.105
                  }
                  stroke={color}
                  strokeOpacity={dimmed ? 0.18 : selected ? 0.9 : 0.48}
                  strokeWidth={selected ? 2 : 1.1}
                  className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-300"
                  onClick={() =>
                    onSelectDivision?.(selected ? null : division)
                  }
                  role={onSelectDivision ? "button" : undefined}
                  tabIndex={onSelectDivision ? 0 : undefined}
                  aria-label={`${division}, risk ${score} out of 100, ${risk?.level ?? "unknown"}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectDivision?.(selected ? null : division);
                    }
                  }}
                />
              );
            },
          )}
        </g>

        {/* Rainfall texture over high-risk divisions */}
        {risks
          .filter((risk) => risk.score >= 62)
          .map((risk) => (
            <path
              key={`rain-${risk.division}`}
              d={polygonPath(
                DIVISION_SHAPES[risk.division] as [number, number][],
              )}
              fill="url(#map-water)"
              pointerEvents="none"
              opacity={risk.score >= 78 ? 0.85 : 0.45}
            />
          ))}

        {/* Division labels */}
        <g pointerEvents="none">
          {LABELS.map((label) => {
            const [x, y] = labelPosition(label);
            const risk = riskByDivision.get(label.division);
            return (
              <g key={label.name}>
                <text
                  x={x + (label.dx ?? 0)}
                  y={y + (label.dy ?? 0)}
                  textAnchor="middle"
                  fill="rgba(220,240,250,0.62)"
                  fontSize="8.5"
                  fontWeight="600"
                  letterSpacing="2.2"
                  fontFamily="var(--font-space-grotesk)"
                >
                  {label.name}
                </text>
                {!compact && risk && (
                  <text
                    x={x + (label.dx ?? 0)}
                    y={y + (label.dy ?? 0) + 13}
                    textAnchor="middle"
                    fill={riskColor(risk.score)}
                    fontSize="8"
                    letterSpacing="0.4"
                    fontFamily="var(--font-inter)"
                    opacity="0.9"
                  >
                    {risk.score}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Hotspot exposure rings */}
        {layers.hotspots && (
          <g>
            {HOTSPOTS.map((hotspot) => {
              const [x, y] = project(hotspot.lat, hotspot.lng);
              const radius = 5 + hotspot.exposure / 26;
              return (
                <g key={hotspot.id} opacity={selectedDivision && selectedDivision !== hotspot.division ? 0.25 : 0.6}>
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="none"
                    stroke="rgba(232,243,250,0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <circle cx={x} cy={y} r="1.6" fill="rgba(232,243,250,0.55)" />
                  <title>
                    {hotspot.area}: exposure {hotspot.exposure}/100
                  </title>
                </g>
              );
            })}
          </g>
        )}

        {/* Safe points */}
        {layers.safePoints && (
          <g>
            {SAFE_POINTS.map((point) => {
              const [x, y] = project(point.lat, point.lng);
              return (
                <g key={point.id} transform={`translate(${x},${y})`}>
                  <path
                    d="M0 -7 L7 5 L-7 5 Z"
                    fill="#B9F45B"
                    fillOpacity="0.9"
                    stroke="#0a121c"
                    strokeWidth="1.5"
                  />
                  <title>{point.label} — safe assembly point</title>
                </g>
              );
            })}
          </g>
        )}

        {/* Reports */}
        {layers.reports && (
          <g>
            {visibleReports.map((report) => {
              const [x, y] = project(report.lat, report.lng);
              const style = SEVERITY_STYLES[report.severity];
              const radius =
                report.severity === "critical"
                  ? 6.5
                  : report.severity === "severe"
                    ? 5
                    : 4;
              const dimmed =
                selectedDivision && selectedDivision !== report.division;
              const active = selectedReport?.id === report.id;
              return (
                <g
                  key={report.id}
                  transform={`translate(${x},${y})`}
                  opacity={dimmed ? 0.22 : 1}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedReport(report);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${style.label} flooding in ${report.area}, ${report.depthCm} centimetres, ${relativeTime(report.createdAt, now)}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedReport(report);
                    }
                  }}
                >
                  {report.severity === "critical" && (
                    <circle
                      r={radius + 4}
                      fill="none"
                      stroke={style.hex}
                      strokeOpacity="0.5"
                      strokeWidth="1"
                      className="pulse-ring"
                    />
                  )}
                  {active && (
                    <circle
                      r={radius + 9}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.75"
                      strokeWidth="1.2"
                    />
                  )}
                  <circle
                    r={radius + 3.5}
                    fill={style.hex}
                    opacity="0.14"
                    filter="url(#marker-glow)"
                  />
                  <circle
                    r={radius}
                    fill={style.hex}
                    stroke="#071019"
                    strokeWidth="2"
                  />
                  <circle r="1.6" fill="#071019" opacity="0.8" />
                  <title>
                    {report.area}: {report.depthCm} cm — {style.label}
                  </title>
                </g>
              );
            })}
          </g>
        )}

        {/* North arrow + scale */}
        <g transform={`translate(${VIEW.width - 40}, 54)`} opacity="0.55">
          <path
            d="M0 -12 L5 6 L0 2 L-5 6 Z"
            fill="rgba(232,243,250,0.7)"
          />
          <text
            y="-18"
            textAnchor="middle"
            fill="rgba(232,243,250,0.7)"
            fontSize="8"
            letterSpacing="1"
            fontFamily="var(--font-space-grotesk)"
          >
            N
          </text>
        </g>
        <g transform={`translate(${VIEW.width - 150}, ${VIEW.height - 24})`} opacity="0.5">
          <line
            x1="0"
            y1="0"
            x2="82"
            y2="0"
            stroke="rgba(232,243,250,0.6)"
            strokeWidth="1.4"
          />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="rgba(232,243,250,0.6)" />
          <line x1="82" y1="-4" x2="82" y2="4" stroke="rgba(232,243,250,0.6)" />
          <text
            x="41"
            y="12"
            textAnchor="middle"
            fill="rgba(232,243,250,0.55)"
            fontSize="7.5"
            letterSpacing="0.8"
          >
            2 km
          </text>
        </g>
      </svg>

      {/* Top-left title */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[58%]">
        <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-aqua">
          <span className="live-dot" />
          Live risk map
        </div>
        <p className="mt-1.5 font-display text-sm font-medium text-foam">
          Kampala · five divisions
        </p>
        <p className="mt-0.5 text-[10px] text-mist">
          {reports.length} community reports ·{" "}
          {formatClock(new Date(now).toISOString())} EAT
        </p>
      </div>

      {/* Layer controls */}
      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1">
        {(
          [
            { id: "reports", label: "Reports" },
            { id: "hotspots", label: "Hotspots" },
            { id: "safePoints", label: "Safe points" },
          ] as { id: Layer; label: string }[]
        ).map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() =>
              setLayers((previous) => ({
                ...previous,
                [layer.id]: !previous[layer.id],
              }))
            }
            className={cn(
              "inline-flex items-center justify-end gap-1.5 rounded-md border px-2 py-1.5 text-[9px] font-medium uppercase tracking-[0.06em] backdrop-blur-md transition",
              layers[layer.id]
                ? "border-aqua/25 bg-[#081a22]/90 text-aqua"
                : "border-line bg-[#071019]/85 text-mist hover:text-foam",
            )}
            aria-pressed={layers[layer.id]}
            aria-label={`${layers[layer.id] ? "Hide" : "Show"} ${layer.label.toLowerCase()} layer`}
            title={`${layers[layer.id] ? "Hide" : "Show"} ${layer.label.toLowerCase()}`}
          >
            {layers[layer.id] ? (
              <Eye className="size-2.5" aria-hidden />
            ) : (
              <EyeOff className="size-2.5" aria-hidden />
            )}
            <span className="hidden sm:inline">{layer.label}</span>
          </button>
        ))}
      </div>

      {/* Division filter chip */}
      {selectedDivision && (
        <button
          type="button"
          onClick={() => onSelectDivision?.(null)}
          className="absolute left-3 top-[72px] inline-flex items-center gap-1.5 rounded-full border border-aqua/30 bg-aqua/10 px-2.5 py-1 text-[10px] font-medium text-aqua backdrop-blur-md transition hover:bg-aqua/20"
        >
          <MapPin className="size-3" aria-hidden />
          {selectedDivision}
          <X className="size-3" aria-hidden />
        </button>
      )}

      {/* Legend */}
      {!selectedReport && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-[#071019]/85 px-2.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {[
              { label: "Low", color: "#3EE0FF" },
              { label: "Elevated", color: "#5EEAD4" },
              { label: "High", color: "#FFB454" },
              { label: "Severe", color: "#FF6B6B" },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1 text-[8px] uppercase tracking-[0.06em] text-mist"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[7.5px] text-mist/50">
            Boundaries: geoBoundaries · CC BY 3.0 IGO
          </p>
        </div>
      )}

      {/* Selected report card */}
      {selectedReport && (
        <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-line bg-[#08131d]/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:inset-x-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={selectedReport.severity} />
                <span className="text-[10px] uppercase tracking-[0.08em] text-mist">
                  {selectedReport.area} · {selectedReport.division}
                </span>
              </div>
              <p className="mt-1.5 truncate font-display text-sm font-medium text-foam">
                {selectedReport.ai.headline}
              </p>
              <p className="mt-1 truncate text-[11px] text-mist">
                {selectedReport.depthCm} cm · {selectedReport.landmark} ·{" "}
                {relativeTime(selectedReport.createdAt, now)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onSelectReport?.(selectedReport);
                  setSelectedReport(null);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-aqua px-2.5 py-1.5 text-[10px] font-semibold text-[#031016] transition hover:bg-[#7aecff]"
              >
                Details
                <ArrowUpRight className="size-3" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="grid size-7 place-items-center rounded-md border border-line text-mist transition hover:text-foam"
                aria-label="Close report preview"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Division risk tooltip */}
      {selectedDivision && !selectedReport && (() => {
        const risk = riskByDivision.get(selectedDivision);
        if (!risk) return null;
        return (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-line bg-[#071019]/90 px-3 py-2 backdrop-blur-md">
            <p className="text-[9px] uppercase tracking-[0.12em] text-mist">
              {selectedDivision}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="font-display text-2xl font-semibold"
                style={{ color: riskColor(risk.score) }}
              >
                {risk.score}
              </span>
              <span className="text-[10px] text-mist">
                {riskLevelFromScore(risk.score)} · {risk.reports} reports
              </span>
            </div>
            <p className="mt-0.5 text-[9px] text-mist/70">
              {risk.level === "Severe"
                ? "Avoid travel unless necessary"
                : risk.level === "High"
                  ? "Expect road closures"
                  : risk.level === "Elevated"
                    ? "Watch low-lying roads"
                    : "Conditions manageable"}
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function severityOrder(severity: FloodReport["severity"]): number {
  return severity === "critical"
    ? 4
    : severity === "severe"
      ? 3
      : severity === "moderate"
        ? 2
        : 1;
}

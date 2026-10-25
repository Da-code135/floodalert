"use client";

import { useId, useState } from "react";
import {
  RAINFALL_FORECAST_MM,
  RAINFALL_NEXT_6H_MM,
  RAINFALL_PAST_MM,
} from "@/data/kampala";
import { cn, formatClock } from "@/lib/format";

const WIDTH = 520;
const HEIGHT = 188;
const MARGIN = { top: 14, right: 8, bottom: 24, left: 26 };

export function RainfallChart({
  now,
  className,
}: {
  now: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);

  const all = [...RAINFALL_PAST_MM, ...RAINFALL_FORECAST_MM];
  const max = Math.max(12, Math.ceil(Math.max(...all) / 4) * 4);
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const step = innerWidth / all.length;
  const barWidth = Math.min(12, step * 0.64);

  const point = (mm: number, index: number) => {
    const x = MARGIN.left + index * step + step / 2;
    const height = (mm / max) * innerHeight;
    const y = MARGIN.top + innerHeight - height;
    return { x, y, height };
  };

  const activeData =
    active === null
      ? null
      : {
          mm: all[active],
          forecast: active >= RAINFALL_PAST_MM.length,
          time: formatClock(
            new Date(
              now +
                (active - (RAINFALL_PAST_MM.length - 1)) * 60 * 60 * 1000,
            ).toISOString(),
          ),
        };

  return (
    <div className={cn("relative", className)}>
      {activeData && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-md border border-line bg-[#08131d]/95 px-2.5 py-1.5 text-right backdrop-blur-md">
          <p className="text-[9px] uppercase tracking-[0.1em] text-mist">
            {activeData.forecast ? "Forecast" : "Observed"} · {activeData.time}
          </p>
          <p className="font-display text-sm font-semibold text-foam">
            {activeData.mm.toFixed(1)} mm/h
          </p>
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Rainfall for the last 24 hours totalling ${RAINFALL_PAST_MM.reduce((sum, value) => sum + value, 0).toFixed(1)} millimetres, with ${RAINFALL_NEXT_6H_MM} millimetres forecast over the next six hours`}
      >
        <defs>
          <linearGradient id={`rain-past-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7BEEFF" />
            <stop offset="100%" stopColor="#1A8FA8" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id={`rain-now-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9F45B" />
            <stop offset="100%" stopColor="#6E9E2E" stopOpacity="0.7" />
          </linearGradient>
          <pattern
            id={`rain-forecast-${id}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="5" height="5" fill="rgba(255,196,87,0.10)" />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke="rgba(255,196,87,0.55)"
              strokeWidth="2"
            />
          </pattern>
        </defs>

        {[0, 0.5, 1].map((fraction) => {
          const y = MARGIN.top + innerHeight * fraction;
          const value = Math.round(max * (1 - fraction));
          return (
            <g key={fraction}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                stroke="rgba(148,190,220,0.1)"
                strokeWidth="1"
                strokeDasharray={fraction === 1 ? undefined : "2 5"}
              />
              <text
                x={MARGIN.left - 6}
                y={y + 2.5}
                textAnchor="end"
                fill="rgba(138,162,182,0.55)"
                fontSize="7"
              >
                {value}
              </text>
            </g>
          );
        })}

        {all.map((mm, index) => {
          const { x, y, height } = point(mm, index);
          const forecast = index >= RAINFALL_PAST_MM.length;
          const isNow = index === RAINFALL_PAST_MM.length - 1;
          return (
            <g
              key={index}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive(null)}
            >
              <rect
                x={x - step / 2}
                y={MARGIN.top}
                width={step}
                height={innerHeight}
                fill="transparent"
              />
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(height, mm > 0 ? 1.5 : 0)}
                rx="2"
                fill={
                  forecast
                    ? `url(#rain-forecast-${id})`
                    : isNow
                      ? `url(#rain-now-${id})`
                      : `url(#rain-past-${id})`
                }
                opacity={
                  active === index ? 1 : forecast ? 0.9 : 0.55 + index * 0.016
                }
                stroke={active === index ? "rgba(232,243,250,0.7)" : "none"}
                strokeWidth="0.8"
              />
              <title>
                {formatClock(
                  new Date(
                    now +
                      (index - (RAINFALL_PAST_MM.length - 1)) * 60 * 60 * 1000,
                  ).toISOString(),
                )}
                : {mm.toFixed(1)} mm/h{forecast ? " (forecast)" : ""}
              </title>
            </g>
          );
        })}

        <line
          x1={
            MARGIN.left +
            RAINFALL_PAST_MM.length * step -
            step / 2
          }
          x2={
            MARGIN.left +
            RAINFALL_PAST_MM.length * step -
            step / 2
          }
          y1={MARGIN.top - 4}
          y2={MARGIN.top + innerHeight}
          stroke="rgba(185,244,91,0.55)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <text
          x={
            MARGIN.left +
            RAINFALL_PAST_MM.length * step -
            step / 2
          }
          y={HEIGHT - 7}
          textAnchor="middle"
          fill="#B9F45B"
          fontSize="7.5"
          letterSpacing="0.8"
        >
          NOW
        </text>

        {[
          { index: 0, label: "−24h" },
          { index: 11, label: "−12h" },
          { index: 23, label: "−1h" },
          { index: 29, label: "+6h" },
        ].map((tick) => {
          const x = MARGIN.left + tick.index * step + step / 2;
          return (
            <text
              key={tick.label}
              x={x}
              y={HEIGHT - 7}
              textAnchor="middle"
              fill="rgba(138,162,182,0.55)"
              fontSize="7.5"
              letterSpacing="0.4"
            >
              {tick.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

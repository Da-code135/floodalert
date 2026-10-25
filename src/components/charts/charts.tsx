"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { riskColor, riskLevelFromScore } from "@/lib/risk";

export function CountUp({
  value,
  format = (input: number) => Math.round(input).toString(),
  duration = 900,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const from = previous.current;
    const start = performance.now();

    if (reduced || duration === 0) {
      setDisplay(value);
      previous.current = value;
      return;
    }

    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = value;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={cn("number-tabular", className)}>
      {format(display)}
    </span>
  );
}

export function RiskGauge({
  score,
  trend = 0,
  className,
}: {
  score: number;
  trend?: number;
  className?: string;
}) {
  const color = riskColor(score);
  const level = riskLevelFromScore(score);
  const id = useId().replace(/:/g, "");

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 240 142"
        className="w-full"
        role="img"
        aria-label={`City flood risk ${score} out of 100, ${level}`}
      >
        <defs>
          <linearGradient id={`gauge-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3EE0FF" />
            <stop offset="45%" stopColor="#B9F45B" />
            <stop offset="72%" stopColor="#FFC457" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M 22 122 A 98 98 0 0 1 218 122"
          fill="none"
          stroke="rgba(148,190,220,0.12)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 22 122 A 98 98 0 0 1 218 122"
          fill="none"
          stroke={`url(#gauge-${id})`}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${Math.max(1, score)} 100`}
          filter={`url(#glow-${id})`}
          opacity="0.92"
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle
          cx={22 + (196 * score) / 100}
          cy={122 - Math.sin((Math.PI * score) / 100) * 98}
          r="4"
          fill="#E8F3FA"
          stroke={color}
          strokeWidth="2"
        />

        <text
          x="120"
          y="92"
          textAnchor="middle"
          fill="#E8F3FA"
          fontSize="42"
          fontWeight="600"
          letterSpacing="-2"
          fontFamily="var(--font-space-grotesk)"
        >
          {score}
        </text>
        <text
          x="120"
          y="110"
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontWeight="600"
          letterSpacing="2.4"
          fontFamily="var(--font-space-grotesk)"
        >
          {level.toUpperCase()}
        </text>

        <text
          x="22"
          y="137"
          textAnchor="middle"
          fill="rgba(138,162,182,0.7)"
          fontSize="7.5"
          letterSpacing="0.6"
        >
          0
        </text>
        <text
          x="120"
          y="137"
          textAnchor="middle"
          fill="rgba(138,162,182,0.7)"
          fontSize="7.5"
          letterSpacing="0.6"
        >
          50
        </text>
        <text
          x="218"
          y="137"
          textAnchor="middle"
          fill="rgba(138,162,182,0.7)"
          fontSize="7.5"
          letterSpacing="0.6"
        >
          100
        </text>
      </svg>

      <div className="absolute right-0 top-1 rounded-md border border-white/10 bg-white/4 px-2 py-1 text-right">
        <p className="text-[8px] uppercase tracking-[0.12em] text-mist">
          Next 6h
        </p>
        <p
          className={cn(
            "text-[10px] font-semibold",
            trend >= 0 ? "text-coral" : "text-lime",
          )}
        >
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </p>
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  color = "#3EE0FF",
  height = 42,
  className,
  label,
}: {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const width = 160;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - 4 - ((value - min) / range) * (height - 10);
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="2.4"
          fill={color}
        />
      )}
    </svg>
  );
}

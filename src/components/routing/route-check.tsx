"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Navigation,
  Route,
  ShieldCheck,
} from "lucide-react";
import { ROUTE_NODES } from "@/data/kampala";
import { cn } from "@/lib/format";
import { findRoutes } from "@/lib/routing";
import { riskColor, riskLevelFromScore } from "@/lib/risk";
import type { DivisionRisk, RouteOption } from "@/lib/types";

function RiskPill({ score }: { score: number }) {
  const level = riskLevelFromScore(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{
        color: riskColor(score),
        borderColor: `${riskColor(score)}44`,
        backgroundColor: `${riskColor(score)}12`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: riskColor(score) }}
      />
      {level} risk
    </span>
  );
}

function RouteCard({
  option,
  recommended = false,
}: {
  option: RouteOption;
  recommended?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        recommended
          ? "border-lime/25 bg-lime/[0.035]"
          : "border-line bg-white/[0.02]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-[9px] font-semibold uppercase tracking-[0.12em]",
              recommended ? "text-lime" : "text-mist",
            )}
          >
            {recommended ? "Recommended" : "Shortest"}
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-foam">
            {option.minutes}
            <span className="ml-1 text-[11px] font-normal text-mist">min</span>
          </p>
          <p className="mt-0.5 text-[9px] text-mist">
            {option.penalty > 0
              ? `includes +${option.penalty} min flood delay`
              : "no flood delay on this route"}
          </p>
        </div>
        <RiskPill score={option.risk} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {option.path.map((node, index) => (
          <span key={node.id} className="flex items-center gap-1">
            {index > 0 && (
              <ArrowRight className="size-2.5 text-mist/40" aria-hidden />
            )}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px]",
                index === 0 || index === option.path.length - 1
                  ? "bg-white/8 text-foam"
                  : "bg-white/4 text-mist",
              )}
            >
              {node.label}
            </span>
          </span>
        ))}
      </div>

      {option.warnings.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {option.warnings.slice(0, 2).map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-1.5 text-[9px] leading-relaxed text-amber/85"
            >
              <CircleAlert className="mt-0.5 size-2.5 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      )}
      {option.warnings.length === 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[9px] text-lime/80">
          <ShieldCheck className="size-2.5" aria-hidden />
          No reported flooding on this corridor.
        </p>
      )}
    </div>
  );
}

export function RouteCheck({
  risks,
  className,
}: {
  risks: DivisionRisk[];
  className?: string;
}) {
  const [from, setFrom] = useState("bwaise");
  const [to, setTo] = useState("central");
  const comparison = useMemo(
    () => findRoutes(from, to, risks),
    [from, to, risks],
  );

  const sameRoute =
    comparison &&
    comparison.safest.path.map((node) => node.id).join("-") ===
      comparison.fastest.path.map((node) => node.id).join("-");

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <Route className="size-3.5 text-aqua" aria-hidden />
            <h2 className="font-display text-sm font-semibold text-foam">
              Route check
            </h2>
          </div>
          <p className="mt-1 text-[10px] text-mist">
            For boda riders, responders and parents doing the school run.
          </p>
        </div>
        <span className="rounded-full border border-aqua/20 bg-aqua/8 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-aqua">
          Live risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] text-mist">
            From
          </span>
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-line bg-[#0a1621] px-2.5 text-[11px] text-foam outline-none transition focus:border-aqua/50"
          >
            {ROUTE_NODES.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] text-mist">
            To
          </span>
          <select
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-line bg-[#0a1621] px-2.5 text-[11px] text-foam outline-none transition focus:border-aqua/50"
          >
            {ROUTE_NODES.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 space-y-2.5 px-5 py-4">
        {!comparison ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-line bg-white/[0.02] text-center">
            <Navigation className="size-4 text-mist/50" aria-hidden />
            <p className="mt-2 text-[11px] text-mist">
              Choose two different places to compare routes.
            </p>
          </div>
        ) : (
          <>
            <RouteCard option={comparison.safest} recommended />
            {sameRoute ? (
              <p className="flex items-center gap-1.5 px-1 text-[9px] text-mist">
                <Clock3 className="size-2.5" aria-hidden />
                The shortest route is also the safest right now.
              </p>
            ) : (
              <RouteCard option={comparison.fastest} />
            )}
          </>
        )}
      </div>

          {comparison && (
            <div className="border-t border-line px-5 py-3">
              {comparison.safest.risk >= 76 && (
                <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-coral/25 bg-coral/8 px-2.5 py-2 text-[9px] leading-relaxed text-coral/90">
                  <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                  No low-risk route right now. Consider delaying non-essential
                  travel until the water recedes.
                </div>
              )}
              <p className="text-[9px] leading-relaxed text-mist/65">
                {comparison.safest.minutes < comparison.fastest.minutes
                  ? `Recommended route saves ${comparison.fastest.minutes - comparison.safest.minutes} min of expected travel time after flood delays.`
                  : comparison.safest.minutes > comparison.fastest.minutes
                    ? `Recommended route adds ${comparison.safest.minutes - comparison.fastest.minutes} min but avoids the worst corridor.`
                    : "Safest and shortest coincide right now."}{" "}
                Estimates use live report density and drainage exposure, not
                real-time water sensors.
              </p>
            </div>
          )}
    </div>
  );
}

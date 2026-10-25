"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ImageIcon,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import {
  cn,
  formatClock,
  relativeTime,
  SEVERITY_STYLES,
  SOURCE_SHORT,
} from "@/lib/format";
import type { FloodReport } from "@/lib/types";
import { SeverityBadge } from "@/components/ui/primitives";

type Filter = "all" | "critical" | "unverified";

export function ReportFeed({
  reports,
  now,
  onSelect,
  limit = 6,
  showFilters = true,
  className,
  title = "Community reports",
  action,
}: {
  reports: FloodReport[];
  now: number;
  onSelect: (report: FloodReport) => void;
  limit?: number;
  showFilters?: boolean;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const base =
      filter === "critical"
        ? reports.filter((report) => report.severity === "critical")
        : filter === "unverified"
          ? reports.filter((report) => report.status === "unverified")
          : reports;
    return base.slice(0, limit);
  }, [reports, filter, limit]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      critical: reports.filter((report) => report.severity === "critical")
        .length,
      unverified: reports.filter((report) => report.status === "unverified")
        .length,
    }),
    [reports],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-foam">
            {title}
          </h2>
          <span className="rounded-full border border-line bg-white/4 px-1.5 py-0.5 text-[9px] text-mist">
            {reports.length}
          </span>
        </div>
        {action}
      </div>

      {showFilters && (
        <div className="flex items-center gap-1 px-5 pb-3">
          {(
            [
              { id: "all", label: "Latest" },
              { id: "critical", label: "Critical" },
              { id: "unverified", label: "Unverified" },
            ] as { id: Filter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[10px] font-medium transition",
                filter === tab.id
                  ? "bg-white/8 text-foam"
                  : "text-mist hover:bg-white/4 hover:text-foam",
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-[9px] text-mist/60">
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Inbox className="size-6 text-mist/50" aria-hidden />
            <p className="mt-2 text-xs text-mist">
              No reports match this filter.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {filtered.map((report) => {
              const style = SEVERITY_STYLES[report.severity];
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(report)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03] sm:px-5"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border",
                        style.bg,
                        style.border,
                      )}
                    >
                      <ShieldAlert
                        className={cn("size-3.5", style.text)}
                        aria-hidden
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-medium text-foam">
                          {report.area}
                        </p>
                        <span className="shrink-0 text-[9px] text-mist/70">
                          {report.division}
                        </span>
                        {report.photo && (
                          <ImageIcon
                            className="size-3 shrink-0 text-mist/50"
                            aria-hidden
                          />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-mist">
                        {report.ai.headline}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-mist/65">
                        <span className={style.text}>
                          {report.depthCm} cm
                        </span>
                        <span className="text-mist/30">·</span>
                        <span>{SOURCE_SHORT[report.source]}</span>
                        <span className="text-mist/30">·</span>
                        <span>{relativeTime(report.createdAt, now)}</span>
                        <span className="text-mist/30">·</span>
                        <span>{report.id}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <SeverityBadge severity={report.severity} size="xs" />
                      {report.status === "resolved" ? (
                        <span className="inline-flex items-center gap-1 text-[9px] text-lime/80">
                          <CheckCircle2 className="size-2.5" aria-hidden />
                          Resolved
                        </span>
                      ) : (
                        <span className="text-[9px] text-mist/60">
                          {formatClock(report.createdAt)}
                        </span>
                      )}
                    </div>

                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-mist/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-aqua"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3">
        <p className="text-[9px] text-mist/60">
          Reports are verified before broadcast ·{" "}
          <span className="text-aqua/70">demo data</span>
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-aqua transition hover:text-foam"
        >
          Alert centre
          <ArrowUpRight className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

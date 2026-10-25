"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  ChevronRight,
  CloudRain,
  FileText,
  Languages,
  Megaphone,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { KampalaMap } from "@/components/map/kampala-map";
import { ReportDrawer } from "@/components/reports/report-drawer";
import { ReportFeed } from "@/components/reports/report-feed";
import { RouteCheck } from "@/components/routing/route-check";
import { RainfallChart } from "@/components/charts/rainfall-chart";
import { CountUp, RiskGauge, Sparkline } from "@/components/charts/charts";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import { Panel, SeverityBadge } from "@/components/ui/primitives";
import {
  RAINFALL_24H_MM,
  RAINFALL_NEXT_6H_MM,
  RAINFALL_PAST_MM,
} from "@/data/kampala";
import {
  cn,
  formatClock,
  formatCompact,
  formatNumber,
  formatSeconds,
  relativeTime,
} from "@/lib/format";
import { reportsByHour, riskColor } from "@/lib/risk";
import type { DivisionName, FloodReport } from "@/lib/types";

export default function DashboardPage() {
  const {
    hydrated,
    reports,
    alerts,
    divisionRisks,
    cityRisk,
    metrics,
    now,
  } = useFloodAlert();
  const [selectedDivision, setSelectedDivision] =
    useState<DivisionName | null>(null);
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(
    null,
  );

  const hourly = useMemo(
    () => reportsByHour(reports, 18, now),
    [reports, now],
  );
  const reportsLast3h = useMemo(
    () =>
      reports.filter(
        (report) => now - Date.parse(report.createdAt) <= 3 * 60 * 60 * 1000,
      ).length,
    [reports, now],
  );
  const recentAlerts = useMemo(
    () => [...alerts].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt)).slice(-6),
    [alerts],
  );
  const trend = Math.round(
    divisionRisks.reduce((sum, risk) => sum + risk.trend, 0) /
      Math.max(divisionRisks.length, 1),
  );
  const peakRain = Math.max(...RAINFALL_PAST_MM);
  const latestAlert = alerts[0];
  const topRisk = divisionRisks[0];

  if (!hydrated) return <DashboardSkeleton />;

  return (
    <>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute -right-24 -top-40 size-[620px] rounded-full border border-aqua/8" />
          <div className="absolute -right-4 -top-24 size-[420px] rounded-full border border-aqua/8" />
          <div className="absolute -right-16 top-16 size-[260px] rounded-full border border-lime/8" />
          <div className="absolute inset-0 rain-lines opacity-50" />
        </div>

        <section className="container-page relative grid gap-8 pb-8 pt-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:pb-10 lg:pt-12">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral/8 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-coral">
                <TriangleAlert className="size-3" aria-hidden />
                Heavy rain · next 6h
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-mist">
                <span className="live-dot" />
                {formatNumber(metrics.reports24h)} reports in the last 24h
              </span>
            </div>

            <h1 className="mt-5 max-w-[760px] font-display text-[38px] font-semibold leading-[0.98] tracking-[-0.04em] text-foam sm:text-[52px] lg:text-[58px]">
              The warning arrives{" "}
              <span className="text-gradient-water">before the water</span>{" "}
              does.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-[14px] leading-relaxed text-mist sm:text-[15px]">
              <span className="font-medium text-foam">FloodAlert</span> is
              Kampala&apos;s last-mile flood alarm. A 20-second community
              report becomes a verified, bilingual warning in minutes — built
              for the streets where official alerts stop.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/report"
                className="group inline-flex items-center gap-2 rounded-lg bg-aqua px-4 py-3 text-[13px] font-semibold text-[#031016] shadow-[0_0_35px_-10px_rgba(62,224,255,0.9)] transition hover:bg-[#7aecff]"
              >
                <Plus className="size-4" aria-hidden />
                Report flooding
                <ArrowUpRight
                  className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/alerts"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/4 px-4 py-3 text-[13px] font-medium text-foam transition hover:border-aqua/30 hover:bg-white/8"
              >
                <Radio className="size-4 text-aqua" aria-hidden />
                Alert centre
                <span className="ml-1 rounded-full bg-amber/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber">
                  {alerts.length}
                </span>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-mist/75">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-lime" aria-hidden />
                Human-verified before broadcast
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-3 text-aqua" aria-hidden />
                English + Luganda
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Camera className="size-3 text-violet" aria-hidden />
                Works on 2G, SMS and USSD
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel className="relative overflow-hidden p-4 sm:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">City flood risk</p>
                  <p className="mt-1 text-[10px] text-mist">
                    Population-weighted · live
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/20 bg-lime/6 px-2 py-1 text-[8px] uppercase tracking-[0.1em] text-lime">
                  <span className="live-dot" />
                  Live
                </span>
              </div>
              <RiskGauge
                score={cityRisk}
                trend={trend}
                className="mx-auto mt-1 w-full max-w-[300px]"
              />
              <div className="grid grid-cols-3 divide-x divide-line border-t border-line pt-3">
                {[
                  {
                    label: "Highest",
                    value: topRisk ? topRisk.division.split(" ")[0] : "—",
                    sub: topRisk ? `${topRisk.score}/100` : "",
                  },
                  {
                    label: "Rain 24h",
                    value: `${RAINFALL_24H_MM}`,
                    sub: "mm",
                  },
                  {
                    label: "Alerts",
                    value: `${alerts.length}`,
                    sub: "sent",
                  },
                ].map((item) => (
                  <div key={item.label} className="px-2.5 first:pl-0 last:pr-0">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-mist">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate font-display text-[13px] font-semibold text-foam">
                      {item.value}
                      <span className="ml-0.5 text-[8px] font-normal text-mist">
                        {item.sub}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="relative overflow-hidden p-4 sm:col-span-1 lg:hidden xl:block">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Rainfall</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-foam">
                    {RAINFALL_24H_MM}
                    <span className="ml-1 text-[10px] font-normal text-mist">
                      mm / 24h
                    </span>
                  </p>
                </div>
                <CloudRain className="size-4 text-aqua" aria-hidden />
              </div>
              <RainfallChart now={now} className="mt-2" />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5 text-[9px]">
                <span className="text-mist">
                  Next 6h{" "}
                  <span className="font-semibold text-amber">
                    {RAINFALL_NEXT_6H_MM} mm
                  </span>
                </span>
                <span className="text-mist">
                  Peak{" "}
                  <span className="font-semibold text-foam">
                    {peakRain.toFixed(1)} mm/h
                  </span>
                </span>
              </div>
            </Panel>
          </div>
        </section>
      </div>

      <div className="container-page">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Reports · 24h"
            icon={FileText}
            accent="aqua"
            value={metrics.reports24h}
            format={(value) => formatNumber(value)}
            detail={`${reportsLast3h} in the last 3 hours`}
            trend="up"
            series={hourly.map((entry) => entry.count)}
          />
          <KpiCard
            label="People reached"
            icon={Users}
            accent="lime"
            value={metrics.reach}
            format={formatCompact}
            detail={`${metrics.alerts24h} alerts · 4 channels`}
            trend="up"
            series={recentAlerts.map((alert) => alert.reach)}
          />
          <KpiCard
            label="Median alert time"
            icon={Timer}
            accent="amber"
            value={metrics.responseSeconds}
            format={(value) => formatSeconds(value)}
            detail="from report to broadcast"
            trend="down"
            series={[310, 296, 284, 270, 258, 246, metrics.responseSeconds]}
          />
          <KpiCard
            label="Verified"
            icon={BadgeCheck}
            accent="violet"
            value={metrics.verifiedRate}
            format={(value) => `${Math.round(value)}%`}
            detail={`${metrics.verified} of ${metrics.reports24h} reports`}
            trend="up"
            ring
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-12">
          <Panel className="overflow-hidden lg:col-span-8">
            <KampalaMap
              risks={divisionRisks}
              reports={reports}
              now={now}
              selectedDivision={selectedDivision}
              onSelectDivision={setSelectedDivision}
              onSelectReport={setSelectedReport}
              className="h-[520px] rounded-none border-0 sm:h-[600px]"
            />
          </Panel>

          <div className="grid gap-4 lg:col-span-4">
            <Panel className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="eyebrow">Division risk index</p>
                  <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                    Where the water is winning
                  </p>
                </div>
                <ShieldCheck className="size-4 shrink-0 text-aqua" aria-hidden />
              </div>
              <ul className="divide-y divide-line/60">
                {divisionRisks.map((risk) => {
                  const active = selectedDivision === risk.division;
                  return (
                    <li key={risk.division}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDivision(active ? null : risk.division)
                        }
                        className={cn(
                          "flex w-full items-center gap-3 px-5 py-3 text-left transition",
                          active ? "bg-white/[0.04]" : "hover:bg-white/[0.025]",
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: riskColor(risk.score),
                            boxShadow: `0 0 10px ${riskColor(risk.score)}66`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12px] font-medium text-foam">
                              {risk.division}
                            </p>
                            <span
                              className="font-display text-[13px] font-semibold"
                              style={{ color: riskColor(risk.score) }}
                            >
                              {risk.score}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
                              <div
                                className="h-full rounded-full transition-[width] duration-700"
                                style={{
                                  width: `${risk.score}%`,
                                  backgroundColor: riskColor(risk.score),
                                }}
                              />
                            </div>
                            <span className="w-14 shrink-0 text-right text-[8px] uppercase tracking-[0.06em] text-mist">
                              {risk.level}
                            </span>
                          </div>
                          <p className="mt-1 text-[9px] text-mist/60">
                            {risk.reports} reports ·{" "}
                            {formatCompact(risk.peopleAtRisk)} people exposed
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "size-3 shrink-0 text-mist/30 transition",
                            active && "rotate-90 text-aqua",
                          )}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line px-5 py-3">
                <p className="text-[9px] leading-relaxed text-mist/60">
                  Score = 24h rainfall (35%) + report pressure (30%) +
                  structural vulnerability (20%) + drainage deficit (15%).
                </p>
              </div>
            </Panel>

            <Panel className="hidden overflow-hidden lg:block">
              <div className="flex items-start justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="eyebrow">Rainfall</p>
                  <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                    The storm is not finished
                  </p>
                </div>
                <CloudRain className="size-4 text-aqua" aria-hidden />
              </div>
              <div className="px-4 pb-2 pt-3">
                <div className="flex items-end justify-between px-1">
                  <div>
                    <p className="font-display text-2xl font-semibold text-foam">
                      {RAINFALL_24H_MM}
                      <span className="ml-1 text-[10px] font-normal text-mist">
                        mm
                      </span>
                    </p>
                    <p className="text-[9px] text-mist">last 24 hours</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-amber">
                      +{RAINFALL_NEXT_6H_MM}
                      <span className="ml-1 text-[9px] font-normal text-mist">
                        mm
                      </span>
                    </p>
                    <p className="text-[9px] text-mist">next 6 hours</p>
                  </div>
                </div>
                <RainfallChart now={now} className="mt-1" />
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[9px] text-mist">
                <span>
                  Peak{" "}
                  <span className="text-foam">{peakRain.toFixed(1)} mm/h</span>
                </span>
                <span>
                  Gauge:{" "}
                  <span className="text-foam">Kampala Central</span>
                </span>
              </div>
            </Panel>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-12">
          <Panel className="overflow-hidden lg:col-span-7">
            <ReportFeed
              reports={reports}
              now={now}
              onSelect={setSelectedReport}
              limit={6}
              action={
                <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-mist">
                  <Activity className="size-3 text-lime" aria-hidden />
                  Auto-updating
                </span>
              }
            />
          </Panel>

          <Panel className="overflow-hidden lg:col-span-5">
            <RouteCheck risks={divisionRisks} />
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-12">
          <Panel className="relative overflow-hidden lg:col-span-7">
            <div className="absolute inset-0">
              <Image
                src="/demo/flood-4.jpg"
                alt="Residents standing in floodwater outside their home in Kampala"
                fill
                className="object-cover object-center opacity-35"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070f17] via-[#070f17]/82 to-[#070f17]/20" />
            </div>
            <div className="relative p-6 sm:p-8">
              <p className="eyebrow text-aqua">The last mile</p>
              <h2 className="mt-2 max-w-md font-display text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foam sm:text-[30px]">
                See water? Say something.
              </h2>
              <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-mist">
                You are the sensor. A photo, a landmark and knee-deep water is
                enough to warn the next street. No app store, no data bundle
                required.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/report"
                  className="inline-flex items-center gap-2 rounded-lg bg-foam px-4 py-2.5 text-xs font-semibold text-[#031016] transition hover:bg-white"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Report in 20 seconds
                </Link>
                <Link
                  href="/alerts"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/6 px-3.5 py-2.5 text-xs font-medium text-foam transition hover:bg-white/10"
                >
                  See live alerts
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              <p className="mt-4 text-[8px] text-mist/50">
                Demo photo: Bwaise, Kampala · CC BY-SA 4.0 · credited in
                /credits
              </p>
            </div>
          </Panel>

          <Panel className="overflow-hidden lg:col-span-5">
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Latest broadcast</p>
                <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                  What the last mile received
                </p>
              </div>
              <Megaphone className="size-4 text-amber" aria-hidden />
            </div>
            {latestAlert ? (
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={latestAlert.severity} />
                  <span className="text-[10px] uppercase tracking-[0.08em] text-mist">
                    {latestAlert.id} · {relativeTime(latestAlert.sentAt, now)}
                  </span>
                </div>
                <p className="mt-2.5 font-display text-[15px] font-medium leading-snug text-foam">
                  {latestAlert.title}
                </p>
                <div className="mt-3 rounded-lg border border-line bg-[#08131d] p-3">
                  <p className="text-[11px] leading-relaxed text-foam/85">
                    {latestAlert.messageEn}
                  </p>
                  <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-mist">
                    {latestAlert.messageLg}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-mist">
                  <span>
                    {formatNumber(latestAlert.reach)} people ·{" "}
                    {latestAlert.channels.join(", ")}
                  </span>
                  <Link
                    href="/alerts"
                    className="inline-flex items-center gap-0.5 text-aqua transition hover:text-foam"
                  >
                    Open
                    <ChevronRight className="size-3" aria-hidden />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                  {[
                    { label: "Sent", value: formatClock(latestAlert.sentAt) },
                    {
                      label: "Reach",
                      value: formatCompact(latestAlert.reach),
                    },
                    {
                      label: "Status",
                      value: latestAlert.status,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[8px] uppercase tracking-[0.1em] text-mist">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] font-medium capitalize text-foam">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="p-5 text-xs text-mist">No alerts sent yet.</p>
            )}
          </Panel>
        </section>

        <section className="py-12 sm:py-16">
          <div className="flex flex-col gap-2 text-center">
            <p className="eyebrow justify-center">How FloodAlert works</p>
            <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-foam sm:text-[32px]">
              From a photo to a phone in under five minutes.
            </h2>
            <p className="mx-auto mt-1 max-w-xl text-[13px] text-mist">
              Four steps, designed for a 2G connection and a feature phone at
              the end of the chain.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute inset-x-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-aqua/25 to-transparent lg:block" />
            {[
              {
                step: "01",
                icon: Camera,
                title: "Report",
                detail:
                  "A 20-second form. Photo, landmark, depth. Works offline and syncs later.",
                tag: "App · SMS · USSD",
                color: "aqua",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "Triage",
                detail:
                  "Gemini reads the photo and text, scores severity and drafts the warning in Luganda.",
                tag: "Gemini 2.5 Flash",
                color: "violet",
              },
              {
                step: "03",
                icon: Megaphone,
                title: "Alert",
                detail:
                  "A human verifies, then SMS, WhatsApp, radio and app push go out to affected circles.",
                tag: "SMS · radio · app",
                color: "amber",
              },
              {
                step: "04",
                icon: ShieldCheck,
                title: "Respond",
                detail:
                  "KCCA and Red Cross acknowledge, dispatch and close the loop. Every action is logged.",
                tag: "KCCA · Red Cross",
                color: "lime",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-line bg-white/[0.025] p-5 transition hover:border-aqua/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border",
                      item.color === "aqua" &&
                        "border-aqua/25 bg-aqua/8 text-aqua",
                      item.color === "violet" &&
                        "border-violet/25 bg-violet/8 text-violet",
                      item.color === "amber" &&
                        "border-amber/25 bg-amber/8 text-amber",
                      item.color === "lime" &&
                        "border-lime/25 bg-lime/8 text-lime",
                    )}
                  >
                    <item.icon className="size-4" aria-hidden />
                  </div>
                  <span className="font-display text-[10px] tracking-[0.12em] text-mist/40">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-3.5 font-display text-[15px] font-semibold text-foam">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-mist">
                  {item.detail}
                </p>
                <p className="mt-3 text-[8px] font-semibold uppercase tracking-[0.1em] text-mist/60">
                  {item.tag}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-white/[0.018] px-5 py-4 sm:flex-row">
            <p className="text-[11px] text-mist">
              <span className="text-foam">Pilot model:</span> Bwaise and
              Kisenyi · 90 days · 5 divisions · 1,680,000 residents in scope.
            </p>
            <Link
              href="/alerts"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-aqua transition hover:text-foam"
            >
              See the alert centre
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          </div>
        </section>
      </div>

      <ReportDrawer
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </>
  );
}

function KpiCard({
  label,
  icon: Icon,
  value,
  format,
  detail,
  accent,
  trend,
  series,
  ring = false,
}: {
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  value: number;
  format: (value: number) => string;
  detail: string;
  accent: "aqua" | "lime" | "amber" | "violet";
  trend: "up" | "down";
  series?: number[];
  ring?: boolean;
}) {
  const accentStyles = {
    aqua: { text: "text-aqua", border: "border-aqua/20", bg: "bg-aqua/8", hex: "#3EE0FF" },
    lime: { text: "text-lime", border: "border-lime/20", bg: "bg-lime/8", hex: "#B9F45B" },
    amber: { text: "text-amber", border: "border-amber/20", bg: "bg-amber/8", hex: "#FFC457" },
    violet: { text: "text-violet", border: "border-violet/20", bg: "bg-violet/8", hex: "#A78BFA" },
  }[accent];

  return (
    <Panel className="relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
          {label}
        </p>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md border",
            accentStyles.border,
            accentStyles.bg,
            accentStyles.text,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em] text-foam">
          {ring ? (
            `${Math.round(value)}%`
          ) : (
            <CountUp value={value} format={format} />
          )}
        </p>
        {!ring && series && series.length > 1 && (
          <div className="mb-0.5 hidden w-16 sm:block">
            <Sparkline
              values={series}
              color={accentStyles.hex}
              height={24}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            "text-[9px] font-medium",
            trend === "up" ? "text-lime" : "text-aqua",
          )}
        >
          {trend === "up" ? "▲" : "▼"}
        </span>
        <p className="text-[9px] text-mist">{detail}</p>
      </div>
      {ring && (
        <div className="absolute bottom-3 right-3">
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={accentStyles.hex}
              strokeWidth="3"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${value} 100`}
            />
          </svg>
        </div>
      )}
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container-page py-10">
      <div className="h-3 w-40 animate-pulse rounded bg-white/8" />
      <div className="mt-5 h-14 w-full max-w-2xl animate-pulse rounded bg-white/6" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-white/5" />
      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-8" />
        <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-4" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl border border-line bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Globe2,
  Loader2,
  Megaphone,
  MessageSquare,
  Radio,
  RadioTower,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { ReportDrawer } from "@/components/reports/report-drawer";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import { Panel, SeverityBadge } from "@/components/ui/primitives";
import { DIVISIONS } from "@/data/kampala";
import {
  cn,
  formatCompact,
  formatNumber,
  formatSeconds,
  relativeTime,
  SEVERITY_STYLES,
  uid,
} from "@/lib/format";
import type {
  AlertChannel,
  DivisionName,
  FloodReport,
  Severity,
} from "@/lib/types";

const CHANNELS: {
  id: AlertChannel;
  label: string;
  detail: string;
  coverage: number;
  icon: typeof MessageSquare;
}[] = [
  {
    id: "SMS",
    label: "SMS",
    detail: "2G feature phones",
    coverage: 0.92,
    icon: MessageSquare,
  },
  {
    id: "WhatsApp",
    label: "WhatsApp",
    detail: "smartphone circles",
    coverage: 0.28,
    icon: Smartphone,
  },
  {
    id: "App push",
    label: "App push",
    detail: "FloodAlert PWA",
    coverage: 0.42,
    icon: Send,
  },
  {
    id: "Radio script",
    label: "Radio script",
    detail: "community stations",
    coverage: 0,
    icon: RadioTower,
  },
];

const SEVERITIES: Severity[] = ["moderate", "severe", "critical"];

function buildTemplate(
  severity: Severity,
  target: DivisionName | "All divisions",
  area: string,
): { en: string; lg: string; title: string } {
  const where =
    target === "All divisions" ? "Kampala" : `${area || target}, ${target}`;
  const action =
    severity === "critical"
      ? "Move to higher ground now. Do not cross fast water. Call 999 if life is at risk."
      : severity === "severe"
        ? "Avoid the area and move to higher ground. Do not cross fast water."
        : "Avoid low-lying roads and open drains. Move valuables above floor level.";
  return {
    title: `${severity === "critical" ? "Critical" : severity === "severe" ? "Severe" : "Flood"} alert · ${target === "All divisions" ? "Kampala" : target}`,
    en: `${severity.toUpperCase()} FLOOD ALERT — ${where}: water is rising near low-lying roads and drains. ${action} Emergency: 999.`,
    lg: `LABULA Y'AMAZZI — ${target === "All divisions" ? "Kampala" : target}: amazzi gaakulukira mu bitundu eby'awansi. Mutuuke waggulu era temuyita mu mazzi. Ssimu y'akabenje: 999.`,
  };
}

export default function AlertsPage() {
  const {
    hydrated,
    alerts,
    circles,
    unverified,
    metrics,
    now,
    addAlert,
    setReportStatus,
    toast,
  } = useFloodAlert();

  const [target, setTarget] = useState<DivisionName | "All divisions">(
    "Kawempe",
  );
  const [area, setArea] = useState("Bwaise · Kanyanya");
  const [severity, setSeverity] = useState<Severity>("severe");
  const [title, setTitle] = useState("Severe flood alert · Kawempe");
  const [messageEn, setMessageEn] = useState(
    "SEVERE FLOOD ALERT — Bwaise and Kanyanya, Kawempe: water is rising near the market and school route. Move to higher ground. Do not cross fast water. Emergency: 999.",
  );
  const [messageLg, setMessageLg] = useState(
    "LABULA Y'AMAZZI — Bwaise ne Kanyanya, Kawempe: amazzi gaakulukira ku katale ne ku kkubo lya ssomero. Mutuuke waggulu era temuyita mu mazzi. Ssimu y'akabenje: 999.",
  );
  const [channels, setChannels] = useState<AlertChannel[]>([
    "SMS",
    "App push",
  ]);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{
    id: string;
    reach: number;
    channels: AlertChannel[];
  } | null>(null);
  const [previewLang, setPreviewLang] = useState<"en" | "lg">("en");
  const [historyFilter, setHistoryFilter] = useState<"all" | "critical">(
    "all",
  );
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(
    null,
  );

  const relevantCircles = useMemo(
    () =>
      circles.filter(
        (circle) =>
          target === "All divisions" ||
          circle.division === target ||
          circle.division === "All divisions",
      ),
    [circles, target],
  );

  const circleMembers = relevantCircles.reduce(
    (sum, circle) => sum + circle.members,
    0,
  );

  const radioReach =
    target === "All divisions" ? 15_300 : target === "Kampala Central" ? 11_400 : 9_800;
  const coverage = Math.max(
    0,
    ...channels
      .map(
        (channel) =>
          CHANNELS.find((candidate) => candidate.id === channel)
            ?.coverage ?? 0,
      )
      .filter((value) => value > 0),
  );
  const estimatedReach =
    Math.round(circleMembers * coverage) +
    (channels.includes("Radio script") ? radioReach : 0);
  const smsCost = messageEn.length > 0 ? Math.ceil(messageEn.length / 160) * 32 : 0;
  const smsRecipients = channels.includes("SMS")
    ? Math.round(circleMembers * 0.92)
    : 0;
  const smsTotal = smsCost * smsRecipients;

  const allAlerts = useMemo(
    () =>
      historyFilter === "critical"
        ? alerts.filter((alert) => alert.severity === "critical")
        : alerts,
    [alerts, historyFilter],
  );

  const toggleChannel = (channel: AlertChannel) => {
    setChannels((previous) =>
      previous.includes(channel)
        ? previous.filter((candidate) => candidate !== channel)
        : [...previous, channel],
    );
  };

  const applyTemplate = () => {
    const template = buildTemplate(severity, target, area);
    setTitle(template.title);
    setMessageEn(template.en);
    setMessageLg(template.lg);
    toast("Template loaded. Edit the details before sending.", "info");
  };

  const send = () => {
    if (channels.length === 0) {
      toast("Select at least one delivery channel.", "error");
      return;
    }
    if (title.trim().length < 4 || messageEn.trim().length < 10) {
      toast("Add a title and a message before sending.", "error");
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      const id = uid("AL");
      addAlert({
        id,
        division: target,
        area: area.trim() || undefined,
        severity,
        title: title.trim(),
        messageEn: messageEn.trim(),
        messageLg: messageLg.trim(),
        channels,
        reach: estimatedReach,
        sentAt: new Date().toISOString(),
        status: "delivered",
      });
      setReceipt({ id, reach: estimatedReach, channels });
      setSending(false);
      toast(
        `Alert ${id} sent to ${formatNumber(estimatedReach)} people across ${channels.length} channels.`,
        "success",
      );
    }, 1_300);
  };

  if (!hydrated) {
    return (
      <div className="container-page py-12">
        <div className="h-4 w-40 animate-pulse rounded bg-white/8" />
        <div className="mt-5 h-12 max-w-xl animate-pulse rounded bg-white/6" />
        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          <div className="h-[620px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-7" />
          <div className="h-[620px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-page py-8 sm:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-px w-6 bg-aqua/60" />
              Alert centre · Kampala
            </p>
            <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.035em] text-foam sm:text-[44px]">
              Reach the last mile,{" "}
              <span className="text-gradient-water">not just the feed.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist">
              One verified report, four channels, two languages. Compose an
              alert, estimate who it reaches and keep the response loop
              accountable.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-md">
            {[
              { label: "Delivered · 24h", value: metrics.alerts24h },
              { label: "Estimated reach", value: metrics.reach, compact: true },
              { label: "Median time", value: metrics.responseSeconds, time: true },
              { label: "Languages", value: 2 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-line bg-white/[0.025] px-3 py-2.5"
              >
                <p className="text-[8px] uppercase tracking-[0.09em] text-mist">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-foam">
                  {item.time ? (
                    formatSeconds(item.value)
                  ) : item.compact ? (
                    formatCompact(item.value)
                  ) : (
                    formatNumber(item.value)
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-12">
          <Panel className="overflow-hidden lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Compose broadcast</p>
                <p className="mt-1.5 font-display text-lg font-semibold text-foam">
                  One message, every phone
                </p>
              </div>
              <button
                type="button"
                onClick={applyTemplate}
                className="inline-flex items-center gap-1.5 rounded-md border border-aqua/25 bg-aqua/8 px-2.5 py-1.5 text-[9px] font-medium text-aqua transition hover:bg-aqua/14"
              >
                <Sparkles className="size-3" aria-hidden />
                Load template
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                  Target area
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTarget("All divisions")}
                    className={cn(
                      "rounded-lg border px-2.5 py-2 text-[10px] font-medium transition",
                      target === "All divisions"
                        ? "border-violet/40 bg-violet/10 text-violet"
                        : "border-line bg-white/[0.025] text-mist hover:text-foam",
                    )}
                  >
                    All divisions
                  </button>
                  {DIVISIONS.map((division) => (
                    <button
                      key={division.name}
                      type="button"
                      onClick={() => setTarget(division.name)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-[10px] font-medium transition",
                        target === division.name
                          ? "border-aqua/40 bg-aqua/10 text-aqua"
                          : "border-line bg-white/[0.025] text-mist hover:text-foam",
                      )}
                    >
                      {division.name.replace("Kampala ", "")}
                    </button>
                  ))}
                </div>
                <input
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder="Specific areas or landmarks (optional)"
                  className="mt-2 h-9 w-full rounded-lg border border-line bg-[#0a1621] px-3 text-[11px] text-foam placeholder:text-mist/35 outline-none transition focus:border-aqua/50"
                />
              </div>

              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                  Severity
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SEVERITIES.map((item) => {
                    const style = SEVERITY_STYLES[item];
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSeverity(item)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-medium capitalize transition",
                          severity === item
                            ? cn(style.bg, style.border, style.text)
                            : "border-line bg-white/[0.025] text-mist hover:text-foam",
                        )}
                      >
                        <span
                          className={cn("size-1.5 rounded-full", style.dot)}
                        />
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                  Alert title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={90}
                  className="h-9 rounded-lg border border-line bg-[#0a1621] px-3 text-[11px] text-foam outline-none transition focus:border-aqua/50"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                    English SMS
                    <span
                      className={cn(
                        "text-[8px] normal-case tracking-normal",
                        messageEn.length > 320 ? "text-coral" : "text-mist/50",
                      )}
                    >
                      {messageEn.length}/320
                    </span>
                  </span>
                  <textarea
                    value={messageEn}
                    onChange={(event) => setMessageEn(event.target.value)}
                    rows={5}
                    className="resize-none rounded-lg border border-line bg-[#0a1621] px-3 py-2.5 text-[11px] leading-relaxed text-foam outline-none transition focus:border-aqua/50"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                    Luganda
                    <span className="text-[8px] normal-case tracking-normal text-mist/50">
                      {messageLg.length} chars
                    </span>
                  </span>
                  <textarea
                    value={messageLg}
                    onChange={(event) => setMessageLg(event.target.value)}
                    rows={5}
                    className="resize-none rounded-lg border border-line bg-[#0a1621] px-3 py-2.5 text-[11px] leading-relaxed text-foam outline-none transition focus:border-aqua/50"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-mist">
                    Channels
                  </p>
                  <p className="text-[9px] text-mist/60">
                    Estimated reach{" "}
                    <span className="font-semibold text-foam">
                      {formatNumber(estimatedReach)}
                    </span>
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {CHANNELS.map((channel) => {
                    const active = channels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => toggleChannel(channel.id)}
                        className={cn(
                          "rounded-lg border px-2.5 py-2.5 text-left transition",
                          active
                            ? "border-aqua/35 bg-aqua/8"
                            : "border-line bg-white/[0.02] hover:border-white/20",
                        )}
                        aria-pressed={active}
                      >
                        <div className="flex items-center justify-between">
                          <channel.icon
                            className={cn(
                              "size-3.5",
                              active ? "text-aqua" : "text-mist",
                            )}
                            aria-hidden
                          />
                          {active && (
                            <Check className="size-3 text-aqua" aria-hidden />
                          )}
                        </div>
                        <p className="mt-1.5 text-[10px] font-medium text-foam">
                          {channel.label}
                        </p>
                        <p className="mt-0.5 text-[8px] text-mist">
                          {channel.detail}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-[#08131d] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-mist">
                    Phone preview
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewLang("en")}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8px]",
                        previewLang === "en"
                          ? "bg-aqua/12 text-aqua"
                          : "text-mist",
                      )}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang("lg")}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8px]",
                        previewLang === "lg"
                          ? "bg-lime/12 text-lime"
                          : "text-mist",
                      )}
                    >
                      LG
                    </button>
                  </div>
                </div>
                <div className="mx-auto mt-3 max-w-[320px] rounded-[16px] border border-white/10 bg-[#0c1722] p-2.5 shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-white/6 pb-1.5">
                    <span className="text-[8px] text-mist">FloodAlert</span>
                    <span className="text-[8px] text-mist">now</span>
                  </div>
                  <div className="mt-2 rounded-xl rounded-tl-sm bg-[#123442] px-3 py-2.5">
                    <p className="text-[10px] leading-relaxed text-foam/90">
                      {previewLang === "en" ? messageEn : messageLg}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[7px] text-mist/60">
                    <span>
                      {previewLang === "en" ? messageEn.length : messageLg.length}{" "}
                      chars · {channels.join(" + ") || "no channel"}
                    </span>
                    <span>SMS</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[9px] leading-relaxed text-mist/70">
                  <p>
                    {formatNumber(estimatedReach)} people across{" "}
                    {relevantCircles.length} circles ·{" "}
                    {channels.includes("Radio script")
                      ? `includes ${formatNumber(radioReach)} radio listeners`
                      : "no radio script selected"}
                  </p>
                  <p className="mt-0.5">
                    SMS cost ≈ {formatNumber(smsTotal)} UGX for{" "}
                    {formatNumber(smsRecipients)} SMS recipients · delivery is
                    simulated in this demo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] shadow-[0_0_30px_-10px_rgba(62,224,255,0.9)] transition hover:bg-[#7aecff] disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Megaphone className="size-3.5" aria-hidden />
                  )}
                  {sending ? "Sending…" : "Send alert"}
                </button>
              </div>

              {receipt && (
                <div className="flex items-start gap-2.5 rounded-xl border border-lime/25 bg-lime/6 px-3.5 py-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-lime">
                      {receipt.id} delivered
                    </p>
                    <p className="mt-0.5 text-[9px] text-mist">
                      {formatNumber(receipt.reach)} people ·{" "}
                      {receipt.channels.join(" + ")} · visible in the alert
                      history below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="text-[9px] text-mist transition hover:text-foam"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </Panel>

          <div className="space-y-4 lg:col-span-5">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="eyebrow">Verification queue</p>
                  <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                    {unverified.length} waiting for a human
                  </p>
                </div>
                <ClipboardCheck className="size-4 text-amber" aria-hidden />
              </div>
              {unverified.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                  <ShieldCheck className="size-6 text-lime" aria-hidden />
                  <p className="mt-2 text-[11px] text-mist">
                    Queue clear. New reports appear here instantly.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {unverified.map((report) => (
                    <li key={report.id} className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-1 size-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              SEVERITY_STYLES[report.severity].hex,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[11px] font-medium text-foam">
                              {report.area}
                            </p>
                            <span className="text-[8px] text-mist/60">
                              {relativeTime(report.createdAt, now)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-mist">
                            {report.ai.headline}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <SeverityBadge
                              severity={report.severity}
                              size="xs"
                            />
                            <span className="text-[8px] text-mist/60">
                              {report.depthCm} cm ·{" "}
                              {Math.round(report.confidence * 100)}%
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReportStatus(report.id, "verified");
                                toast(
                                  `${report.id} verified. Ready to broadcast.`,
                                  "success",
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-aqua/25 bg-aqua/8 px-2 py-1 text-[8px] font-medium text-aqua transition hover:bg-aqua/14"
                            >
                              <Check className="size-2.5" aria-hidden />
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[8px] text-mist transition hover:text-foam"
                            >
                              Review
                              <ChevronRight className="size-2.5" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-line px-5 py-2.5">
                <p className="text-[8px] text-mist/60">
                  Critical reports should be verified against a monitor call
                  before broadcast.
                </p>
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="eyebrow">Subscriber circles</p>
                  <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                    {formatNumber(circleMembers)} in scope
                  </p>
                </div>
                <Users className="size-4 text-aqua" aria-hidden />
              </div>
              <ul className="divide-y divide-line/60">
                {relevantCircles.slice(0, 6).map((circle) => (
                  <li
                    key={circle.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-medium text-foam">
                        {circle.name}
                      </p>
                      <p className="mt-0.5 text-[8px] text-mist/65">
                        {circle.contact} · {circle.languages.join(", ")}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-[11px] font-semibold text-mist">
                      {formatNumber(circle.members)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-5 py-2.5">
                <p className="text-[8px] text-mist/60">
                  Circles are community-managed. Residents can opt out by
                  replying STOP to any SMS.
                </p>
              </div>
            </Panel>

            <Panel className="border-lime/15 bg-lime/[0.02] p-5">
              <div className="flex items-center gap-2">
                <Globe2 className="size-3.5 text-lime" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lime">
                  Delivery health
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "SMS gateway", value: 98.4, color: "#B9F45B" },
                  { label: "WhatsApp", value: 95.1, color: "#3EE0FF" },
                  { label: "App push", value: 99.2, color: "#A78BFA" },
                  { label: "Radio scripts", value: 100, color: "#FFC457" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-mist">{item.label}</span>
                      <span className="text-foam">{item.value}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[8px] text-mist/55">
                Simulated telemetry · no live SMS gateway is connected in this
                demo.
              </p>
            </Panel>
          </div>
        </div>

        <section className="mt-4 grid gap-4 lg:grid-cols-12">
          <Panel className="overflow-hidden lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Alert history</p>
                <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                  Every message we sent
                </p>
              </div>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "critical", label: "Critical" },
                  ] as { id: "all" | "critical"; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryFilter(tab.id)}
                    className={cn(
                      "rounded px-2.5 py-1 text-[9px] font-medium transition",
                      historyFilter === tab.id
                        ? "bg-white/8 text-foam"
                        : "text-mist hover:text-foam",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-line text-[8px] uppercase tracking-[0.1em] text-mist/60">
                    <th className="px-5 py-2.5 font-medium">Alert</th>
                    <th className="px-3 py-2.5 font-medium">Area</th>
                    <th className="px-3 py-2.5 font-medium">Channels</th>
                    <th className="px-3 py-2.5 text-right font-medium">Reach</th>
                    <th className="px-5 py-2.5 text-right font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {allAlerts.slice(0, 7).map((alert) => (
                    <tr
                      key={alert.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 size-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                SEVERITY_STYLES[alert.severity].hex,
                            }}
                          />
                          <div>
                            <p className="max-w-[260px] truncate text-[10px] font-medium text-foam">
                              {alert.title}
                            </p>
                            <p className="mt-0.5 font-mono text-[8px] text-mist/60">
                              {alert.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[9px] text-mist">
                        {alert.area
                          ? `${alert.area} · ${alert.division}`
                          : alert.division}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {alert.channels.map((channel) => (
                            <span
                              key={channel}
                              className="rounded border border-line bg-white/4 px-1 py-0.5 text-[7px] text-mist"
                            >
                              {channel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-[10px] text-foam">
                        {formatNumber(alert.reach)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-[9px] text-mist">
                          {relativeTime(alert.sentAt, now)}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[8px] text-lime">
                          <CheckCircle2 className="size-2.5" aria-hidden />
                          {alert.status}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
              <p className="text-[8px] text-mist/60">
                Showing {Math.min(7, allAlerts.length)} of {allAlerts.length}{" "}
                alerts · demo delivery only
              </p>
              <Link
                href="/report"
                className="inline-flex items-center gap-1 text-[9px] text-aqua transition hover:text-foam"
              >
                Report flooding
                <ArrowUpRight className="size-2.5" aria-hidden />
              </Link>
            </div>
          </Panel>

          <Panel className="overflow-hidden lg:col-span-4">
            <div className="border-b border-line px-5 py-4">
              <p className="eyebrow">The last-mile stack</p>
              <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                Meet people where they are
              </p>
            </div>
            <ul className="divide-y divide-line/60">
              {[
                {
                  icon: MessageSquare,
                  label: "SMS",
                  detail: "Feature phones · 160 chars",
                  meta: "UGX 32",
                },
                {
                  icon: Radio,
                  label: "USSD *247#",
                  detail: "No smartphone, no data",
                  meta: "Free",
                },
                {
                  icon: RadioTower,
                  label: "Community radio",
                  detail: "Luganda script for drive-time",
                  meta: "10k+",
                },
                {
                  icon: Smartphone,
                  label: "WhatsApp + PWA",
                  detail: "Photos, maps and receipts",
                  meta: "2G",
                },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="grid size-8 place-items-center rounded-lg border border-line bg-white/4 text-aqua">
                    <item.icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-foam">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[8px] text-mist">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-medium text-mist">
                    {item.meta}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-3">
              <div className="flex items-center gap-2 text-[8px] text-mist">
                <AlertTriangle className="size-3 text-amber" aria-hidden />
                SMS is the only channel that works for every subscriber.
              </div>
            </div>
          </Panel>
        </section>
      </div>

      <ReportDrawer
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </>
  );
}

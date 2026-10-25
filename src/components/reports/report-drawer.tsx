"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  Cpu,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import {
  cn,
  formatClock,
  formatNumber,
  relativeTime,
  SOURCE_LABEL,
  uid,
} from "@/lib/format";
import type { AlertRecord, FloodReport } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "@/components/ui/primitives";

export function ReportDrawer({
  report,
  onClose,
}: {
  report: FloodReport | null;
  onClose: () => void;
}) {
  const {
    circles,
    alerts,
    addAlert,
    setReportStatus,
    toast,
  } = useFloodAlert();
  const [tab, setTab] = useState<"en" | "lg">("en");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const open = Boolean(report);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    setTab("en");
    setCopied(false);
  }, [report?.id]);

  if (!mounted || !report) return null;

  const divisionCircles = circles.filter(
    (circle) =>
      circle.division === report.division ||
      circle.division === "All divisions",
  );
  const reach = divisionCircles.reduce(
    (sum, circle) => sum + circle.members,
    0,
  );
  const existingAlert = alerts.find(
    (alert) => alert.reportId === report.id,
  );
  const message = tab === "en" ? report.ai.alertEn : report.ai.alertLg;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast("Clipboard access was blocked by the browser.", "error");
    }
  };

  const broadcast = () => {
    if (!report) return;
    const alert: AlertRecord = {
      id: uid("AL"),
      division: report.division,
      area: report.area,
      severity: report.severity,
      title: report.ai.headline,
      messageEn: report.ai.alertEn,
      messageLg: report.ai.alertLg,
      channels: ["SMS", "App push"],
      reach,
      sentAt: new Date().toISOString(),
      status: "delivered",
      reportId: report.id,
    };
    addAlert(alert);
    setReportStatus(report.id, "responding");
    toast(
      `Alert queued to ${formatNumber(reach)} subscribers in ${report.division}.`,
      "success",
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-[#02060b]/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close report details"
        tabIndex={-1}
      />
      <aside className="animate-slide-in relative flex h-full w-full max-w-[540px] flex-col overflow-y-auto border-l border-line bg-[#070f17] shadow-[-30px_0_80px_rgba(0,0,0,0.6)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-[#070f17]/95 px-5 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mist">
              {report.id}
            </span>
            <StatusBadge status={report.status} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/alerts"
              className="hidden items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-mist transition hover:text-foam sm:inline-flex"
            >
              Alert centre
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-md border border-line bg-white/4 text-mist transition hover:border-coral/30 hover:text-foam"
              aria-label="Close report details"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {report.photo && (
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-line bg-[#0a151f]">
            {report.photo.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.photo}
                alt={`Flood report from ${report.area}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={report.photo}
                alt={`Flood report from ${report.area}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 540px"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#070f17] via-[#070f17]/40 to-transparent p-4 pt-12">
              <p className="text-[9px] uppercase tracking-[0.1em] text-mist/80">
                {report.photo.startsWith("/demo/")
                  ? "Reporter photo · demo image (CC BY-SA 4.0)"
                  : "Reporter photo · stored on this device"}
              </p>
            </div>
            <span className="absolute left-4 top-4">
              <SeverityBadge severity={report.severity} size="md" />
            </span>
          </div>
        )}

        <div className="flex-1 px-5 py-5">
          {!report.photo && (
            <div className="mb-4 flex items-center gap-2">
              <SeverityBadge severity={report.severity} size="md" />
            </div>
          )}

          <h2
            id="report-drawer-title"
            className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-foam"
          >
            {report.ai.headline}
          </h2>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-mist">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3 text-aqua/80" aria-hidden />
              {report.area} · {report.division}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden />
              {relativeTime(report.createdAt)} · {formatClock(report.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" aria-hidden />
              {SOURCE_LABEL[report.source]}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Water depth", value: `${report.depthCm} cm` },
              {
                label: "Confidence",
                value: `${Math.round(report.confidence * 100)}%`,
              },
              {
                label: "AI engine",
                value:
                  report.ai.engine === "gemini" ? "Gemini" : "Edge",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-line bg-white/[0.025] px-3 py-2.5"
              >
                <p className="text-[8px] uppercase tracking-[0.1em] text-mist">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-foam">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {report.ai.engine === "gemini" ? (
                  <Sparkles className="size-3.5 text-aqua" aria-hidden />
                ) : (
                  <Cpu className="size-3.5 text-amber" aria-hidden />
                )}
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foam">
                  {report.ai.engine === "gemini"
                    ? "Gemini 2.5 Flash triage"
                    : "Edge model · offline fallback"}
                </p>
              </div>
              {report.ai.latencyMs && (
                <span className="text-[9px] text-mist">
                  {(report.ai.latencyMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-mist">
              {report.ai.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(report.ai.hazards ?? []).map((hazard) => (
                <span
                  key={hazard}
                  className="rounded-md border border-line bg-white/4 px-2 py-1 text-[9px] text-mist"
                >
                  {hazard}
                </span>
              ))}
            </div>
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[9px] text-mist">
                <span>Model confidence</span>
                <span>{Math.round(report.confidence * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aqua to-lime"
                  style={{
                    width: `${Math.round(report.confidence * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="eyebrow">What residents should do</p>
            <ul className="mt-2.5 space-y-2">
              {report.ai.actions.map((action, index) => (
                <li
                  key={action}
                  className="flex gap-2.5 text-[12px] leading-relaxed text-mist"
                >
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-aqua/25 bg-aqua/8 text-[8px] font-semibold text-aqua">
                    {index + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-[#08131d]">
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab("en")}
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-medium transition",
                    tab === "en"
                      ? "bg-aqua/12 text-aqua"
                      : "text-mist hover:text-foam",
                  )}
                >
                  English SMS
                </button>
                <button
                  type="button"
                  onClick={() => setTab("lg")}
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-medium transition",
                    tab === "lg"
                      ? "bg-lime/12 text-lime"
                      : "text-mist hover:text-foam",
                  )}
                >
                  Luganda
                </button>
              </div>
              <button
                type="button"
                onClick={copyMessage}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-mist transition hover:text-foam"
              >
                {copied ? (
                  <Check className="size-3 text-lime" aria-hidden />
                ) : (
                  <Clipboard className="size-3" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="px-3.5 py-3 text-[12px] leading-relaxed text-foam/90">
              {message}
            </p>
            <p className="border-t border-line px-3.5 py-2 text-[9px] text-mist/70">
              {message.length} characters ·{" "}
              {report.ai.engine === "gemini"
                ? "Gemini-drafted, human review recommended"
                : "Template-generated draft"}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Last-mile reach</p>
                <p className="mt-1.5 font-display text-lg font-semibold text-foam">
                  {formatNumber(reach)}{" "}
                  <span className="text-xs font-normal text-mist">
                    subscribers
                  </span>
                </p>
              </div>
              <div className="text-right text-[10px] text-mist">
                <p>{divisionCircles.length} circles</p>
                <p className="mt-0.5">SMS + app push</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {divisionCircles.map((circle) => (
                <span
                  key={circle.id}
                  className="rounded-md border border-line bg-white/4 px-2 py-1 text-[9px] text-mist"
                  title={`${circle.contact} · ${circle.languages.join(", ")}`}
                >
                  {circle.name} · {circle.members}
                </span>
              ))}
            </div>

            {existingAlert ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-lime/20 bg-lime/6 px-3 py-2.5 text-[11px] text-lime">
                <Check className="size-3.5" aria-hidden />
                Alert {existingAlert.id} delivered to{" "}
                {formatNumber(existingAlert.reach)} people.
              </div>
            ) : report.status === "unverified" ? (
              <button
                type="button"
                onClick={() => {
                  setReportStatus(report.id, "verified");
                  toast("Report verified. You can now broadcast the alert.");
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-aqua/30 bg-aqua/10 px-4 py-2.5 text-xs font-semibold text-aqua transition hover:bg-aqua/16"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Verify report
              </button>
            ) : (
              <button
                type="button"
                onClick={broadcast}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-aqua px-4 py-2.5 text-xs font-semibold text-[#031016] shadow-[0_0_28px_-10px_rgba(62,224,255,0.9)] transition hover:bg-[#7aecff]"
              >
                <Megaphone className="size-3.5" aria-hidden />
                Broadcast to {formatNumber(reach)} subscribers
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {report.status !== "verified" && report.status !== "unverified" && (
              <button
                type="button"
                onClick={() => {
                  setReportStatus(report.id, "verified");
                  toast("Report moved back to verified.", "info");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white/4 px-3 py-2.5 text-[10px] font-medium text-mist transition hover:text-foam"
              >
                <ShieldCheck className="size-3" aria-hidden />
                Mark verified
              </button>
            )}
            {report.status !== "responding" && report.status !== "resolved" && (
              <button
                type="button"
                onClick={() => {
                  setReportStatus(report.id, "responding");
                  toast("Response dispatched to the division team.", "info");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber/25 bg-amber/8 px-3 py-2.5 text-[10px] font-medium text-amber transition hover:bg-amber/12"
              >
                <Truck className="size-3" aria-hidden />
                Dispatch response
              </button>
            )}
            {report.status !== "resolved" && (
              <button
                type="button"
                onClick={() => {
                  setReportStatus(report.id, "resolved");
                  toast("Report closed. Water level should be re-checked.", "success");
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-lime/25 bg-lime/8 px-3 py-2.5 text-[10px] font-medium text-lime transition hover:bg-lime/12"
              >
                <Check className="size-3" aria-hidden />
                Mark resolved
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-4 text-[10px] leading-relaxed text-mist/70">
            <p>
              Reported by {report.reporter} via {SOURCE_LABEL[report.source]}.
              Coordinates {report.lat.toFixed(4)}, {report.lng.toFixed(4)}.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium text-aqua/80 transition hover:text-aqua"
            >
              Open location in Google Maps
              <ArrowUpRight className="size-2.5" aria-hidden />
            </a>
            <p className="mt-2">
              Demo data for the Pre-DevFest Hackathon. In a real deployment,
              reports are verified by trained community monitors before
              broadcast.
            </p>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

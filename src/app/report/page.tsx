"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  CloudOff,
  Cpu,
  Crosshair,
  ImagePlus,
  Loader2,
  MapPin,
  Megaphone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import { Panel, SeverityBadge } from "@/components/ui/primitives";
import {
  CITY,
  DIVISIONS,
  HAZARD_OPTIONS,
  HOTSPOTS,
  SAMPLE_PHOTOS,
} from "@/data/kampala";
import {
  cn,
  formatNumber,
  SEVERITY_STYLES,
  uid,
} from "@/lib/format";
import { edgeTriage, nearestHotspot } from "@/lib/triage";
import type {
  DivisionName,
  FloodReport,
  TriageResult,
} from "@/lib/types";

type Step = 1 | 2 | 3;
type Phase = "form" | "analyzing" | "ready";
type Photo = {
  src: string;
  label: string;
  mimeType?: string;
  data?: string;
};

const STAGES = [
  "Reading the photo",
  "Scoring depth and hazards",
  "Drafting the Luganda alert",
  "Checking escalation rules",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

async function preparePhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo file (JPG, PNG or WebP).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Photo is larger than 8 MB. Choose a smaller image.");
  }
  const original = await fileToDataUrl(file);
  const image = new Image();
  image.src = original;
  await image.decode().catch(() => undefined);

  const maxSide = 1000;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return { src: original, label: file.name };
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/jpeg", 0.78);
  return {
    src: compressed,
    label: file.name,
    mimeType: "image/jpeg",
    data: compressed.split(",")[1],
  };
}

async function sampleAsPhoto(src: string, label: string): Promise<Photo> {
  const response = await fetch(src);
  const blob = await response.blob();
  const dataUrl = await fileToDataUrl(
    new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" }),
  );
  return {
    src,
    label,
    mimeType: blob.type || "image/jpeg",
    data: dataUrl.split(",")[1],
  };
}

export default function ReportPage() {
  const { hydrated, addReport, addAlert, setReportStatus, circles, toast } =
    useFloodAlert();

  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [stage, setStage] = useState(0);
  const [division, setDivision] = useState<DivisionName>("Kawempe");
  const [area, setArea] = useState("Bwaise II");
  const [landmark, setLandmark] = useState(
    "Bwaise Market, Bombo Road",
  );
  const [depth, setDepth] = useState(35);
  const [hazards, setHazards] = useState<string[]>(["fast-water"]);
  const [description, setDescription] = useState("");
  const [reporter, setReporter] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [consent, setConsent] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    { lat: 0.3575, lng: 32.554 },
  );
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState(false);
  const [tab, setTab] = useState<"en" | "lg">("en");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const areas = useMemo(
    () => HOTSPOTS.filter((hotspot) => hotspot.division === division),
    [division],
  );

  const changeDivision = (next: DivisionName) => {
    setDivision(next);
    const first = HOTSPOTS.find((hotspot) => hotspot.division === next);
    if (first) {
      setArea(first.area);
      setLandmark(`${first.area} centre`);
      setCoords({ lat: first.lat, lng: first.lng });
    }
  };

  useEffect(() => {
    if (phase !== "analyzing") return;
    setStage(0);
    const interval = window.setInterval(() => {
      setStage((current) => Math.min(STAGES.length - 1, current + 1));
    }, 620);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "analyzing" && phase !== "ready") return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("report-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const step1Valid = area.trim().length >= 2 && landmark.trim().length >= 3;
  const step3Valid = consent;

  const selectHazard = (id: string) => {
    setHazards((previous) =>
      previous.includes(id)
        ? previous.filter((hazard) => hazard !== id)
        : [...previous, id],
    );
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const prepared = await preparePhoto(file);
      setPhoto(prepared);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not read that photo.",
        "error",
      );
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      toast("Location is not available in this browser.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestHotspot(
          position.coords.latitude,
          position.coords.longitude,
          division,
        );
        setArea(nearest.area);
        setLandmark(`${nearest.area} · my location`);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
        toast(`Pinned to ${nearest.area}. Adjust the landmark if needed.`, "info");
      },
      () => {
        setLocating(false);
        toast(
          "Location permission was denied. Choose an area and landmark instead.",
          "error",
        );
      },
      { enableHighAccuracy: true, timeout: 8_000 },
    );
  };

  const handleDepth = (value: number) => {
    setDepth(value);
  };

  const reset = () => {
    setStep(1);
    setPhase("form");
    setResult(null);
    setReportId(null);
    setBroadcast(false);
    setPhoto(null);
    setDescription("");
    setReporter("");
    setHazards(["fast-water"]);
    setDepth(35);
    setTab("en");
    setCopied(false);
    setCoords({ lat: 0.3575, lng: 32.554 });
    setDivision("Kawempe");
    setArea("Bwaise II");
    setLandmark("Bwaise Market, Bombo Road");
    window.setTimeout(() => {
      document
        .getElementById("report-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const submit = async () => {
    setPhase("analyzing");
    setStage(0);

    const input = {
      area: area.trim(),
      division,
      landmark: landmark.trim(),
      depthCm: Math.round(depth),
      hazards,
      description: description.trim(),
    };

    let inlinePhoto = photo;
    if (photo && !photo.data) {
      try {
        inlinePhoto = await sampleAsPhoto(photo.src, photo.label);
      } catch {
        inlinePhoto = photo;
      }
    }

    const fallback = edgeTriage(
      {
        ...input,
        image: inlinePhoto?.data
          ? {
              mimeType: inlinePhoto.mimeType ?? "image/jpeg",
              data: inlinePhoto.data,
            }
          : undefined,
      },
      { fallbackReason: "The triage request failed — edge fallback used." },
    );

    let triage = fallback;
    if (navigator.onLine) {
      const request = fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          image: inlinePhoto?.data
            ? {
                mimeType: inlinePhoto.mimeType ?? "image/jpeg",
                data: inlinePhoto.data,
              }
            : undefined,
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Triage ${response.status}`);
          const payload = (await response.json()) as {
            result: TriageResult;
          };
          return payload.result;
        })
        .catch(() => fallback);

      const [answer] = await Promise.all([
        request,
        new Promise((resolve) => setTimeout(resolve, 2_200)),
      ]);
      triage = answer;
    } else {
      triage = edgeTriage(
        {
          ...input,
          image: inlinePhoto?.data
            ? {
                mimeType: inlinePhoto.mimeType ?? "image/jpeg",
                data: inlinePhoto.data,
              }
            : undefined,
        },
        { fallbackReason: "You are offline — edge model used on this device." },
      );
      await new Promise((resolve) => setTimeout(resolve, 1_200));
    }

    const hotspot =
      HOTSPOTS.find((candidate) => candidate.area === area) ??
      HOTSPOTS[0];
    const id = uid("FL");
    const createdAt = new Date().toISOString();
    const newReport: FloodReport = {
      id,
      area: area.trim(),
      division,
      landmark: landmark.trim(),
      lat: coords?.lat ?? hotspot.lat,
      lng: coords?.lng ?? hotspot.lng,
      depthCm: Math.round(depth),
      hazards,
      description: description.trim(),
      photo: photo?.src,
      severity: triage.severity,
      confidence: triage.confidence,
      source: "app",
      status: "unverified",
      reporter: reporter.trim()
        ? `${reporter.trim()} · App reporter`
        : "Anonymous · App reporter",
      createdAt,
      updatedAt: createdAt,
      ai: {
        engine: triage.engine,
        model: triage.model,
        headline: triage.headline,
        summary: triage.summary,
        actions: triage.actions,
        hazards: triage.hazards,
        alertEn: triage.alertEn,
        alertLg: triage.alertLg,
        escalate: triage.escalate,
        latencyMs: triage.latencyMs,
      },
    };

    addReport(newReport);
    setReportId(id);
    setResult(triage);
    setPhase("ready");
    toast("Report added to the live map. Review the triage below.", "success");
  };

  const reach = useMemo(() => {
    const relevant = circles.filter(
      (circle) =>
        circle.division === division || circle.division === "All divisions",
    );
    return {
      total: relevant.reduce((sum, circle) => sum + circle.members, 0),
      circles: relevant,
    };
  }, [circles, division]);

  const sendBroadcast = () => {
    if (!result || !reportId) return;
    addAlert({
      id: uid("AL"),
      division,
      area,
      severity: result.severity,
      title: result.headline,
      messageEn: result.alertEn,
      messageLg: result.alertLg,
      channels: ["SMS", "App push"],
      reach: reach.total,
      sentAt: new Date().toISOString(),
      status: "delivered",
      reportId,
    });
    setReportStatus(reportId, "responding");
    setBroadcast(true);
    toast(
      `Alert sent to ${formatNumber(reach.total)} subscribers in ${division}.`,
      "success",
    );
  };

  if (!hydrated) {
    return (
      <div className="container-page py-12">
        <div className="h-4 w-40 animate-pulse rounded bg-white/8" />
        <div className="mt-5 h-12 max-w-xl animate-pulse rounded bg-white/6" />
        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          <div className="h-[520px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-7" />
          <div className="h-[420px] animate-pulse rounded-2xl border border-line bg-white/[0.03] lg:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(62,224,255,0.09),transparent_70%)]" />

      <div className="container-page relative py-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-px w-6 bg-aqua/60" />
              Field report · Kampala
            </p>
            <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.035em] text-foam sm:text-[44px]">
              Twenty seconds to{" "}
              <span className="text-gradient-water">warn a street.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist">
              No login. No data bundle. A photo, a landmark and how deep the
              water is — enough for Gemini to triage the risk and draft the
              alert.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-mist">
            <div>
              <p className="font-display text-lg font-semibold text-foam">
                ~2.4s
              </p>
              <p>triage latency</p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="font-display text-lg font-semibold text-foam">
                2
              </p>
              <p>languages</p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="font-display text-lg font-semibold text-lime">
                Offline
              </p>
              <p>edge fallback</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7" id="report-panel">
            {phase === "ready" && result ? (
              <ResultPanel
                result={result}
                reportId={reportId}
                division={division}
                area={area}
                depth={depth}
                photoSrc={photo?.src}
                reach={reach.total}
                circleNames={reach.circles.map((circle) => circle.name)}
                broadcast={broadcast}
                onBroadcast={sendBroadcast}
                onReset={reset}
                tab={tab}
                setTab={setTab}
                copied={copied}
                onCopy={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      tab === "en" ? result.alertEn : result.alertLg,
                    );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2_000);
                  } catch {
                    toast("Clipboard access was blocked.", "error");
                  }
                }}
              />
            ) : (
              <Panel className="overflow-hidden">
                <div className="border-b border-line px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">New report</p>
                      <p className="mt-1.5 font-display text-lg font-semibold text-foam">
                        {phase === "analyzing"
                          ? "Gemini is reading the situation"
                          : "Tell us what you can see"}
                      </p>
                    </div>
                    <span className="rounded-md border border-line bg-white/4 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-mist">
                      Step {step} / 3
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {[
                      { step: 1 as Step, label: "Location" },
                      { step: 2 as Step, label: "Conditions" },
                      { step: 3 as Step, label: "Photo" },
                    ].map((item) => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => {
                          if (phase === "analyzing") return;
                          if (item.step < step) setStep(item.step);
                        }}
                        className="group text-left"
                        disabled={phase === "analyzing"}
                      >
                        <div
                          className={cn(
                            "h-1 rounded-full transition-colors",
                            step >= item.step
                              ? "bg-aqua"
                              : "bg-white/8",
                          )}
                        />
                        <p
                          className={cn(
                            "mt-1.5 text-[9px] uppercase tracking-[0.08em]",
                            step >= item.step
                              ? "text-aqua"
                              : "text-mist/60",
                          )}
                        >
                          {item.step}. {item.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {phase === "analyzing" ? (
                  <AnalyzingPanel stage={stage} />
                ) : (
                  <div className="px-5 py-5 sm:px-6">
                    {step === 1 && (
                      <div className="space-y-5">
                        <fieldset>
                          <legend className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                            Which division?
                          </legend>
                          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                            {DIVISIONS.map((item) => (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => changeDivision(item.name)}
                                className={cn(
                                  "rounded-lg border px-2 py-2.5 text-[10px] font-medium transition",
                                  division === item.name
                                    ? "border-aqua/40 bg-aqua/10 text-aqua"
                                    : "border-line bg-white/[0.025] text-mist hover:border-white/20 hover:text-foam",
                                )}
                              >
                                {item.name.replace("Kampala ", "")}
                              </button>
                            ))}
                          </div>
                        </fieldset>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                              Area / parish
                            </span>
                            <select
                              value={area}
                              onChange={(event) => {
                                const next = event.target.value;
                                setArea(next);
                                const hotspot = HOTSPOTS.find(
                                  (candidate) => candidate.area === next,
                                );
                                if (hotspot) {
                                  setCoords({
                                    lat: hotspot.lat,
                                    lng: hotspot.lng,
                                  });
                                }
                              }}
                              className="h-11 appearance-none rounded-lg border border-line bg-[#0a1621] px-3 text-[13px] text-foam outline-none transition focus:border-aqua/50"
                            >
                              {areas.map((hotspot) => (
                                <option key={hotspot.id} value={hotspot.area}>
                                  {hotspot.area}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                              Nearest landmark
                            </span>
                            <input
                              value={landmark}
                              onChange={(event) =>
                                setLandmark(event.target.value)
                              }
                              placeholder="e.g. Bwaise Market, gate 2"
                              className="h-11 rounded-lg border border-line bg-[#0a1621] px-3 text-[13px] text-foam placeholder:text-mist/40 outline-none transition focus:border-aqua/50"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5">
                          <div className="flex items-center gap-2 text-[10px] text-mist">
                            <MapPin className="size-3.5 text-aqua" aria-hidden />
                            {coords
                              ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                              : "No pin yet — choose an area"}
                            <span className="hidden text-mist/40 sm:inline">
                              ·
                            </span>
                            <span className="hidden text-mist/60 sm:inline">
                              A landmark is enough; GPS is optional.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={useLocation}
                            disabled={locating}
                            className="inline-flex items-center gap-1.5 rounded-md border border-aqua/25 bg-aqua/8 px-2.5 py-1.5 text-[9px] font-medium text-aqua transition hover:bg-aqua/14 disabled:opacity-60"
                          >
                            {locating ? (
                              <Loader2 className="size-3 animate-spin" aria-hidden />
                            ) : (
                              <Crosshair className="size-3" aria-hidden />
                            )}
                            Use my location
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                          <p className="text-[9px] text-mist/60">
                            Keep it to the street level. Never enter water to
                            take a photo.
                          </p>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            disabled={!step1Valid}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] transition hover:bg-[#7aecff] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                            <ArrowRight className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                                How deep is the water?
                              </p>
                              <p className="mt-1 text-[9px] text-mist/60">
                                Estimate against ankles, knees, waist or a
                                vehicle wheel.
                              </p>
                            </div>
                            <p className="font-display text-3xl font-semibold text-aqua">
                              {depth}
                              <span className="ml-1 text-xs font-normal text-mist">
                                cm
                              </span>
                            </p>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={120}
                            step={1}
                            value={depth}
                            onChange={(event) =>
                              handleDepth(Number(event.target.value))
                            }
                            className="depth-slider mt-2"
                            style={
                              {
                                "--fill": `${(depth / 120) * 100}%`,
                              } as CSSProperties
                            }
                            aria-label="Estimated water depth in centimetres"
                          />
                          <div className="flex justify-between text-[8px] uppercase tracking-[0.08em] text-mist/50">
                            <span>Dry</span>
                            <span>Ankle · 10</span>
                            <span>Knee · 45</span>
                            <span>Waist · 90</span>
                            <span>120+</span>
                          </div>
                        </div>

                        <fieldset>
                          <legend className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                            What else can you see?{" "}
                            <span className="normal-case text-mist/50">
                              (select all that apply)
                            </span>
                          </legend>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {HAZARD_OPTIONS.map((hazard) => {
                              const active = hazards.includes(hazard.id);
                              return (
                                <button
                                  key={hazard.id}
                                  type="button"
                                  onClick={() => selectHazard(hazard.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] transition",
                                    active
                                      ? hazard.escalate
                                        ? "border-coral/40 bg-coral/10 text-coral"
                                        : "border-aqua/40 bg-aqua/10 text-aqua"
                                      : "border-line bg-white/[0.025] text-mist hover:border-white/20 hover:text-foam",
                                  )}
                                  aria-pressed={active}
                                >
                                  {active ? (
                                    <Check className="size-3" aria-hidden />
                                  ) : (
                                    <PlusDot />
                                  )}
                                  {hazard.label}
                                </button>
                              );
                            })}
                          </div>
                          {hazards.some((hazard) =>
                            ["trapped-people", "power-line", "hospital-access"].includes(
                              hazard,
                            ),
                          ) && (
                            <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-coral/25 bg-coral/8 px-3 py-2.5">
                              <AlertTriangle
                                className="mt-0.5 size-3.5 shrink-0 text-coral"
                                aria-hidden
                              />
                              <p className="text-[10px] leading-relaxed text-coral/90">
                                This will be escalated. If life is at risk,
                                call 999 now — do not wait for the app.
                              </p>
                            </div>
                          )}
                        </fieldset>

                        <label className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                            Describe what you see{" "}
                            <span className="normal-case text-mist/50">
                              (optional)
                            </span>
                          </span>
                          <textarea
                            value={description}
                            onChange={(event) =>
                              setDescription(event.target.value)
                            }
                            maxLength={900}
                            rows={3}
                            placeholder="e.g. Water is above the boda stage and entering shops. Two children are waiting by the wall."
                            className="resize-none rounded-lg border border-line bg-[#0a1621] px-3 py-2.5 text-[12px] leading-relaxed text-foam placeholder:text-mist/35 outline-none transition focus:border-aqua/50"
                          />
                          <span className="text-right text-[8px] text-mist/50">
                            {description.length}/900
                          </span>
                        </label>

                        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-[11px] font-medium text-mist transition hover:text-foam"
                          >
                            <ArrowLeft className="size-3.5" aria-hidden />
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] transition hover:bg-[#7aecff]"
                          >
                            Next
                            <ArrowRight className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-5">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                            Add a photo{" "}
                            <span className="normal-case text-mist/50">
                              (optional, but improves triage)
                            </span>
                          </p>

                          {photo ? (
                            <div className="relative mt-2.5 overflow-hidden rounded-xl border border-line">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.src}
                                alt="Flood report preview"
                                className="h-52 w-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
                                <span className="truncate text-[9px] text-white/75">
                                  {photo.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPhoto(null)}
                                  className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[9px] text-white/80 transition hover:bg-black/70"
                                >
                                  <Trash2 className="size-3" aria-hidden />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                void handleFile(event.dataTransfer.files[0]);
                              }}
                              className="mt-2.5 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-9 text-center transition hover:border-aqua/35 hover:bg-aqua/[0.03]"
                            >
                              <span className="grid size-10 place-items-center rounded-full border border-aqua/20 bg-aqua/8 text-aqua">
                                <Upload className="size-4" aria-hidden />
                              </span>
                              <span className="mt-2.5 text-[11px] font-medium text-foam">
                                Drop a photo or tap to browse
                              </span>
                              <span className="mt-1 text-[9px] text-mist">
                                JPG, PNG or WebP · resized on your device
                              </span>
                            </button>
                          )}
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              void handleFile(event.target.files?.[0])
                            }
                          />

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] uppercase tracking-[0.08em] text-mist/60">
                              Or try a demo photo
                            </span>
                            {SAMPLE_PHOTOS.map((sample) => (
                              <button
                                key={sample.src}
                                type="button"
                                onClick={() =>
                                  setPhoto({
                                    src: sample.src,
                                    label: sample.label,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-line bg-white/4 px-2 py-1 text-[8px] text-mist transition hover:border-aqua/30 hover:text-foam"
                              >
                                <ImagePlus className="size-2.5" aria-hidden />
                                {sample.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-mist">
                              Your name{" "}
                              <span className="normal-case text-mist/50">
                                (optional)
                              </span>
                            </span>
                            <input
                              value={reporter}
                              onChange={(event) =>
                                setReporter(event.target.value)
                              }
                              maxLength={40}
                              placeholder="e.g. Amina K."
                              className="h-10 rounded-lg border border-line bg-[#0a1621] px-3 text-[12px] text-foam placeholder:text-mist/35 outline-none transition focus:border-aqua/50"
                            />
                          </label>
                          <div className="rounded-lg border border-line bg-white/[0.02] px-3 py-2">
                            <p className="text-[8px] uppercase tracking-[0.1em] text-mist">
                              Destination
                            </p>
                            <p className="mt-1 truncate text-[11px] text-foam">
                              {area} · {division}
                            </p>
                            <p className="text-[9px] text-mist">
                              {depth} cm · {hazards.length} hazards
                            </p>
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-white/[0.02] p-3">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) =>
                              setConsent(event.target.checked)
                            }
                            className="mt-0.5 size-3.5 accent-[#3EE0FF]"
                          />
                          <span className="text-[10px] leading-relaxed text-mist">
                            I confirm this report is accurate to the best of my
                            knowledge. I understand it will be stored on this
                            device and may be shared with responders.
                          </span>
                        </label>

                        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-[11px] font-medium text-mist transition hover:text-foam"
                          >
                            <ArrowLeft className="size-3.5" aria-hidden />
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => void submit()}
                            disabled={!step3Valid}
                            className="group inline-flex items-center gap-2 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] shadow-[0_0_30px_-10px_rgba(62,224,255,0.8)] transition hover:bg-[#7aecff] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Sparkles className="size-3.5" aria-hidden />
                            Analyse with Gemini
                            <ArrowRight
                              className="size-3.5 transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </button>
                        </div>
                        <p className="text-center text-[8px] text-mist/50">
                          Demo reports are stored in your browser. No account
                          or phone number required.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Panel>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-5">
            {phase === "ready" && result ? (
              <BroadcastSidebar
                result={result}
                reportId={reportId}
                division={division}
                reach={reach.total}
                circleNames={reach.circles.map((circle) => circle.name)}
                broadcast={broadcast}
                onBroadcast={sendBroadcast}
              />
            ) : (
              <>
                <Panel className="overflow-hidden">
                  <div className="border-b border-line px-5 py-4">
                    <p className="eyebrow">What happens next</p>
                    <p className="mt-1.5 font-display text-sm font-semibold text-foam">
                      From your phone to the street
                    </p>
                  </div>
                  <ol className="relative px-5 py-4">
                    <div className="absolute bottom-7 left-[30px] top-7 w-px bg-line" />
                    {[
                      {
                        icon: Sparkles,
                        title: "Gemini triage",
                        detail:
                          "Reads the photo and text, scores severity, drafts English + Luganda.",
                        time: "~2s",
                        color: "text-violet border-violet/25 bg-violet/8",
                      },
                      {
                        icon: ShieldCheck,
                        title: "Human verification",
                        detail:
                          "A trained monitor or KCCA officer checks the report before broadcast.",
                        time: "< 3 min",
                        color: "text-aqua border-aqua/25 bg-aqua/8",
                      },
                      {
                        icon: Megaphone,
                        title: "Last-mile alert",
                        detail:
                          "SMS to feature phones, WhatsApp, app push and a radio script.",
                        time: "< 5 min",
                        color: "text-amber border-amber/25 bg-amber/8",
                      },
                      {
                        icon: Users,
                        title: "Response loop",
                        detail:
                          "KCCA and Red Cross acknowledge, dispatch and close the report.",
                        time: "Tracked",
                        color: "text-lime border-lime/25 bg-lime/8",
                      },
                    ].map((item) => (
                      <li
                        key={item.title}
                        className="relative flex gap-3 pb-4 last:pb-0"
                      >
                        <span
                          className={cn(
                            "relative z-10 grid size-8 shrink-0 place-items-center rounded-lg border bg-[#0a121c]",
                            item.color,
                          )}
                        >
                          <item.icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-foam">
                              {item.title}
                            </p>
                            <span className="text-[8px] uppercase tracking-[0.08em] text-mist/60">
                              {item.time}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-mist">
                            {item.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Panel>

                <Panel className="border-aqua/15 bg-aqua/[0.025] p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-aqua" aria-hidden />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-aqua">
                      Gemini 2.5 Flash
                    </p>
                    <span className="ml-auto rounded border border-line bg-white/4 px-1.5 py-0.5 text-[8px] text-mist">
                      multimodal
                    </span>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-mist">
                    The model reads the photo and report, returns strict JSON
                    and drafts a Luganda SMS. If the API key is missing or the
                    network drops, the on-device edge model answers instead —
                    the demo never goes dark.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      "structured JSON",
                      "Luganda draft",
                      "escalation rules",
                      "edge fallback",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-line bg-white/4 px-1.5 py-0.5 text-[8px] text-mist"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Panel>

                <Panel className="border-coral/20 bg-coral/[0.035] p-5">
                  <div className="flex items-center gap-2 text-coral">
                    <PhoneCall className="size-3.5" aria-hidden />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">
                      Life-threatening emergency?
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-mist">
                    Call{" "}
                    <a
                      href="tel:999"
                      className="font-semibold text-foam underline decoration-coral/40 underline-offset-2"
                    >
                      999
                    </a>{" "}
                    or KCCA on{" "}
                    <a
                      href={`tel:${CITY.kcca.replace(/\s/g, "")}`}
                      className="font-semibold text-foam underline decoration-coral/40 underline-offset-2"
                    >
                      {CITY.kcca}
                    </a>{" "}
                    first. FloodAlert is a prototype and does not dispatch
                    emergency services.
                  </p>
                </Panel>

                <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-3.5 py-2.5 text-[9px] text-mist">
                  <CloudOff className="size-3.5 text-lime" aria-hidden />
                  Offline? The form still saves locally and uses the edge
                  triage model.
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PlusDot() {
  return (
    <span className="grid size-3 place-items-center rounded-full border border-mist/30 text-[9px] leading-none text-mist/60">
      +
    </span>
  );
}

function AnalyzingPanel({ stage }: { stage: number }) {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="relative grid size-20 place-items-center">
          <span className="absolute inset-0 rounded-full border border-aqua/20 pulse-ring" />
          <span className="absolute inset-2 rounded-full border border-aqua/15" />
          <span className="grid size-14 place-items-center rounded-full border border-aqua/30 bg-aqua/8">
            <Sparkles className="size-6 animate-pulse text-aqua" aria-hidden />
          </span>
        </div>
        <p className="mt-5 font-display text-lg font-semibold text-foam">
          Reading the situation
        </p>
        <p className="mt-1 text-[11px] text-mist">
          Gemini is triaging your report. This usually takes a few seconds.
        </p>

        <ul className="mt-6 w-full space-y-2 text-left">
          {STAGES.map((label, index) => {
            const complete = stage > index;
            const active = stage === index;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[10px] transition",
                  complete
                    ? "border-lime/20 bg-lime/5 text-lime"
                    : active
                      ? "border-aqua/25 bg-aqua/5 text-aqua"
                      : "border-line bg-white/[0.015] text-mist/50",
                )}
              >
                {complete ? (
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                ) : active ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border border-current/40" />
                )}
                {label}
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[8px] text-mist/60">
          If this takes longer than 15 seconds, the edge model will answer
          automatically.
        </p>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  reportId,
  division,
  area,
  depth,
  photoSrc,
  reach,
  circleNames,
  broadcast,
  onBroadcast,
  onReset,
  tab,
  setTab,
  copied,
  onCopy,
}: {
  result: TriageResult;
  reportId: string | null;
  division: DivisionName;
  area: string;
  depth: number;
  photoSrc?: string;
  reach: number;
  circleNames: string[];
  broadcast: boolean;
  onBroadcast: () => void;
  onReset: () => void;
  tab: "en" | "lg";
  setTab: (tab: "en" | "lg") => void;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-lime/25 bg-lime/8 text-lime">
            <CheckCircle2 className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-lime">
              Triage complete
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-mist">
              {reportId ?? "FL"} · {area}, {division}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.engine === "gemini" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-aqua/25 bg-aqua/8 px-2 py-1 text-[8px] uppercase tracking-[0.08em] text-aqua">
              <Sparkles className="size-2.5" aria-hidden />
              {result.model ?? "Gemini"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber/25 bg-amber/8 px-2 py-1 text-[8px] uppercase tracking-[0.08em] text-amber">
              <Cpu className="size-2.5" aria-hidden />
              Edge fallback
            </span>
          )}
          {result.latencyMs && (
            <span className="text-[9px] text-mist">
              {(result.latencyMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {result.escalate && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold text-coral">
                Escalated to responders
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-coral/80">
                This report meets the escalation threshold. Call 999 if life
                is at risk. KCCA and the Red Cross monitor network will be
                notified when the alert is sent.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={result.severity} size="md" />
          <span className="text-[10px] text-mist">
            {Math.round(result.confidence * 100)}% confidence · {depth} cm ·{" "}
            {result.hazards.length} hazards
          </span>
        </div>

        {photoSrc && (
          <div className="float-right mb-2 ml-4 mt-3 size-20 overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
              alt={`Report photo from ${area}`}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-foam">
          {result.headline}
        </h2>
        <p className="mt-2.5 text-[13px] leading-relaxed text-mist">
          {result.summary}
        </p>

        {result.fallbackReason && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/5 px-3 py-2 text-[9px] leading-relaxed text-amber/85">
            <CloudOff className="mt-0.5 size-3 shrink-0" aria-hidden />
            {result.fallbackReason}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {result.hazards.map((hazard) => (
            <span
              key={hazard}
              className="rounded-md border border-line bg-white/4 px-2 py-1 text-[9px] text-mist"
            >
              {hazard}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <p className="eyebrow">Actions for residents</p>
          <ul className="mt-2.5 space-y-2">
            {result.actions.map((action, index) => (
              <li
                key={action}
                className="flex gap-2.5 text-[11px] leading-relaxed text-mist"
              >
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-aqua/25 bg-aqua/8 text-[8px] font-semibold text-aqua">
                  {index + 1}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-[#08131d]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
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
              onClick={onCopy}
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
            {tab === "en" ? result.alertEn : result.alertLg}
          </p>
          <div className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[8px] text-mist/70">
            <span>{(tab === "en" ? result.alertEn : result.alertLg).length} characters</span>
            <span>{result.engine === "gemini" ? "Gemini-drafted" : "Template-generated"}</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Megaphone className="size-3.5 text-amber" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foam">
                {broadcast ? "Alert delivered" : "Ready to broadcast"}
              </p>
            </div>
            <span className="text-[9px] text-mist">
              {formatNumber(reach)} subscribers
            </span>
          </div>
          <p className="mt-1.5 text-[9px] leading-relaxed text-mist">
            {circleNames.slice(0, 3).join(" · ")}
            {circleNames.length > 3 ? ` +${circleNames.length - 3} more` : ""}
          </p>
          {broadcast ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-lime/20 bg-lime/6 px-3 py-2.5 text-[10px] text-lime">
              <CheckCircle2 className="size-3.5" aria-hidden />
              SMS and app push queued. The report is now marked responding.
            </div>
          ) : (
            <button
              type="button"
              onClick={onBroadcast}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 py-2.5 text-[11px] font-semibold text-[#1a1103] transition hover:bg-[#ffd27a]"
            >
              <Megaphone className="size-3.5" aria-hidden />
              Broadcast to {formatNumber(reach)} subscribers
            </button>
          )}
          <p className="mt-2 text-[8px] text-mist/55">
            In production, a human verifier approves this step. The demo lets
            you complete the loop yourself.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/4 px-3 py-2 text-[10px] font-medium text-foam transition hover:border-aqua/30"
          >
            View on live map
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/4 px-3 py-2 text-[10px] font-medium text-foam transition hover:border-aqua/30"
          >
            Open alert centre
            <ChevronRight className="size-3" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-mist transition hover:text-foam"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Report another
          </button>
        </div>
      </div>
    </Panel>
  );
}

function BroadcastSidebar({
  result,
  reportId,
  division,
  reach,
  circleNames,
  broadcast,
  onBroadcast,
}: {
  result: TriageResult;
  reportId: string | null;
  division: DivisionName;
  reach: number;
  circleNames: string[];
  broadcast: boolean;
  onBroadcast: () => void;
}) {
  return (
    <>
      <Panel className="overflow-hidden border-lime/20">
        <div className="border-b border-line px-5 py-4">
          <p className="eyebrow">Report summary</p>
          <p className="mt-1.5 font-display text-sm font-semibold text-foam">
            {result.severity === "critical"
              ? "Life-safety escalation"
              : "Verified path"}
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Severity",
                value: SEVERITY_STYLES[result.severity].label,
              },
              {
                label: "Confidence",
                value: `${Math.round(result.confidence * 100)}%`,
              },
              { label: "Report", value: reportId ?? "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-line bg-white/[0.03] px-2.5 py-2"
              >
                <p className="text-[8px] uppercase tracking-[0.08em] text-mist">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-foam">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.1em] text-mist">
            Reach in {division}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-foam">
            {formatNumber(reach)}
            <span className="ml-1 text-[10px] font-normal text-mist">
              subscribers
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {circleNames.map((name) => (
              <span
                key={name}
                className="rounded border border-line bg-white/4 px-1.5 py-0.5 text-[8px] text-mist"
              >
                {name}
              </span>
            ))}
          </div>

          {!broadcast ? (
            <button
              type="button"
              onClick={onBroadcast}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 py-2.5 text-[11px] font-semibold text-[#1a1103] transition hover:bg-[#ffd27a]"
            >
              <Megaphone className="size-3.5" aria-hidden />
              Send the alert
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-lime/20 bg-lime/6 px-3 py-2.5 text-[10px] text-lime">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Queued to {formatNumber(reach)} people.
            </div>
          )}
        </div>
      </Panel>

      <Panel className="border-aqua/15 bg-aqua/[0.025] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-aqua" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-aqua">
            {result.engine === "gemini" ? "Gemini answered" : "Edge model answered"}
          </p>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-mist">
          {result.engine === "gemini"
            ? `Structured triage returned in ${((result.latencyMs ?? 0) / 1000).toFixed(1)}s with ${result.hazards.length} identified hazards. The English and Luganda alerts are drafts for a human verifier.`
            : "The on-device model handled this report. Add a GEMINI_API_KEY to enable multimodal photo analysis and more natural Luganda drafting."}
        </p>
      </Panel>

      <Panel className="border-coral/20 bg-coral/[0.035] p-5">
        <div className="flex items-center gap-2 text-coral">
          <AlertTriangle className="size-3.5" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">
            Keep the loop human
          </p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mist">
          FloodAlert does not auto-dispatch emergency services. A monitor or
          KCCA officer should verify critical reports, and residents should
          always call 999 when life is at risk.
        </p>
      </Panel>
    </>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { createSeedState } from "@/data/seed";
import {
  connectCloud,
  isCloudConfigured,
  pushAlert,
  pushReport,
  pushReportStatus,
} from "@/lib/cloud";
import {
  computeDivisionRisks,
  computeMetrics,
  overallRisk,
} from "@/lib/risk";
import { cn, uid } from "@/lib/format";
import type {
  AlertRecord,
  AppState,
  FloodReport,
  ReportStatus,
} from "@/lib/types";

const STORAGE_KEY = "floodalert.state.v2";

type CloudStatus = "local" | "connecting" | "connected" | "error";
type ToastTone = "success" | "info" | "error";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type FloodAlertContextValue = {
  state: AppState | null;
  hydrated: boolean;
  now: number;
  cloudStatus: CloudStatus;
  reports: FloodReport[];
  alerts: AlertRecord[];
  circles: AppState["circles"];
  divisionRisks: ReturnType<typeof computeDivisionRisks>;
  cityRisk: number;
  metrics: ReturnType<typeof computeMetrics>;
  unverified: FloodReport[];
  addReport: (report: FloodReport) => void;
  addAlert: (alert: AlertRecord) => void;
  setReportStatus: (id: string, status: ReportStatus) => void;
  resetDemo: () => void;
  toast: (message: string, tone?: ToastTone) => void;
};

const FloodAlertContext = createContext<FloodAlertContextValue | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (
      parsed.version !== 2 ||
      !Array.isArray(parsed.reports) ||
      !Array.isArray(parsed.alerts)
    ) {
      return createSeedState();
    }
    return parsed;
  } catch {
    return createSeedState();
  }
}

function mergeReports(
  local: FloodReport[],
  remote: FloodReport[],
): FloodReport[] {
  const merged = new Map(local.map((report) => [report.id, report]));
  for (const report of remote) {
    if (report?.id && report?.ai) merged.set(report.id, report);
  }
  return Array.from(merged.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

function mergeAlerts(
  local: AlertRecord[],
  remote: AlertRecord[],
): AlertRecord[] {
  const merged = new Map(local.map((alert) => [alert.id, alert]));
  for (const alert of remote) {
    if (alert?.id) merged.set(alert.id, alert);
  }
  return Array.from(merged.values()).sort(
    (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt),
  );
}

const TOAST_ICON = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const TOAST_STYLE = {
  success: "border-lime/30 bg-[#0d1a16] text-lime",
  info: "border-aqua/30 bg-[#091a20] text-aqua",
  error: "border-coral/30 bg-[#1b0d11] text-coral",
};

export function FloodAlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
    setNow(Date.now());

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hydrated || !state) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked (private mode). The demo still runs in memory.
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as AppState;
        if (next.version === 2) setState(next);
      } catch {
        // Ignore malformed cross-tab updates.
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !isCloudConfigured()) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setCloudStatus("connecting");

    connectCloud({
      onReady: () => {
        if (!cancelled) setCloudStatus("connected");
      },
      onError: (error) => {
        console.warn("[FloodAlert] Firestore sync error", error);
        if (!cancelled) setCloudStatus("error");
      },
      onReports: (remote) => {
        if (cancelled) return;
        setState((previous) =>
          previous
            ? {
                ...previous,
                reports: mergeReports(previous.reports, remote),
              }
            : previous,
        );
      },
      onAlerts: (remote) => {
        if (cancelled) return;
        setState((previous) =>
          previous
            ? {
                ...previous,
                alerts: mergeAlerts(previous.alerts, remote),
              }
            : previous,
        );
      },
    })
      .then((stop) => {
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch((error: Error) => {
        console.warn("[FloodAlert] Firestore connection failed", error);
        if (!cancelled) setCloudStatus("error");
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [hydrated]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = uid("toast");
    setToasts((previous) => [...previous.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((entry) => entry.id !== id));
    }, 4_400);
  }, []);

  const addReport = useCallback((report: FloodReport) => {
    setState((previous) =>
      previous
        ? {
            ...previous,
            reports: [
              report,
              ...previous.reports.filter(
                (candidate) => candidate.id !== report.id,
              ),
            ],
          }
        : previous,
    );
    void pushReport(report);
  }, []);

  const addAlert = useCallback((alert: AlertRecord) => {
    setState((previous) =>
      previous
        ? {
            ...previous,
            alerts: [
              alert,
              ...previous.alerts.filter(
                (candidate) => candidate.id !== alert.id,
              ),
            ],
          }
        : previous,
    );
    void pushAlert(alert);
  }, []);

  const setReportStatus = useCallback(
    (id: string, status: ReportStatus) => {
      const updatedAt = new Date().toISOString();
      setState((previous) =>
        previous
          ? {
              ...previous,
              reports: previous.reports.map((report) =>
                report.id === id
                  ? { ...report, status, updatedAt }
                  : report,
              ),
            }
          : previous,
      );
      void pushReportStatus(id, status, updatedAt);
    },
    [],
  );

  const resetDemo = useCallback(() => {
    setState(createSeedState());
    setNow(Date.now());
    toast("Demo reset to the seeded Kampala scenario.", "info");
  }, [toast]);

  const reports = useMemo(() => state?.reports ?? [], [state]);
  const alerts = useMemo(() => state?.alerts ?? [], [state]);
  const circles = useMemo(() => state?.circles ?? [], [state]);

  const divisionRisks = useMemo(
    () => computeDivisionRisks(reports, now),
    [reports, now],
  );
  const cityRisk = useMemo(
    () => overallRisk(divisionRisks),
    [divisionRisks],
  );
  const metrics = useMemo(
    () => computeMetrics(reports, alerts, divisionRisks, now),
    [reports, alerts, divisionRisks, now],
  );
  const unverified = useMemo(
    () => reports.filter((report) => report.status === "unverified"),
    [reports],
  );

  const value = useMemo<FloodAlertContextValue>(
    () => ({
      state,
      hydrated,
      now,
      cloudStatus,
      reports,
      alerts,
      circles,
      divisionRisks,
      cityRisk,
      metrics,
      unverified,
      addReport,
      addAlert,
      setReportStatus,
      resetDemo,
      toast,
    }),
    [
      state,
      hydrated,
      now,
      cloudStatus,
      reports,
      alerts,
      circles,
      divisionRisks,
      cityRisk,
      metrics,
      unverified,
      addReport,
      addAlert,
      setReportStatus,
      resetDemo,
      toast,
    ],
  );

  return (
    <FloodAlertContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((entry) => {
          const Icon = TOAST_ICON[entry.tone];
          return (
            <div
              key={entry.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/50 backdrop-blur-xl",
                TOAST_STYLE[entry.tone],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="flex-1 leading-snug text-foam">{entry.message}</p>
              <button
                type="button"
                onClick={() =>
                  setToasts((previous) =>
                    previous.filter((toastEntry) => toastEntry.id !== entry.id),
                  )
                }
                className="rounded p-0.5 text-mist transition hover:text-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/50"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </FloodAlertContext.Provider>
  );
}

export function useFloodAlert(): FloodAlertContextValue {
  const context = useContext(FloodAlertContext);
  if (!context) {
    throw new Error("useFloodAlert must be used inside FloodAlertProvider");
  }
  return context;
}

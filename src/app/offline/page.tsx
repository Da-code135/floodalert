import Link from "next/link";
import { CloudOff, Home, Wifi } from "lucide-react";

export const metadata = {
  title: "Offline",
  description:
    "FloodAlert is offline. Reports you submitted are saved on this device and will sync when the connection returns.",
};

export default function OfflinePage() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full border border-amber/25 bg-amber/8 text-amber">
        <CloudOff className="size-7" aria-hidden />
      </span>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
        Offline mode
      </p>
      <h1 className="mt-3 max-w-xl font-display text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foam sm:text-[40px]">
        The warning still works without the network.
      </h1>
      <p className="mt-3 max-w-md text-[13px] leading-relaxed text-mist">
        This page was cached on your device. Flood reports you submitted are
        stored locally and will sync when the connection returns. On the report
        form, the edge model can triage without Gemini.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] transition hover:bg-[#7aecff]"
        >
          <Home className="size-3.5" aria-hidden />
          Try the dashboard
        </Link>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/4 px-4 py-2.5 text-[11px] font-medium text-foam transition hover:border-aqua/30"
        >
          <Wifi className="size-3.5" aria-hidden />
          Report offline
        </Link>
      </div>
    </div>
  );
}

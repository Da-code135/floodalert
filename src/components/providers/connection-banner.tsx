"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOffline(!navigator.onLine);
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!mounted || !offline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-lg border border-amber/30 bg-[#1a1408]/95 px-3 py-2 text-[10px] text-amber shadow-2xl shadow-black/50 backdrop-blur-xl sm:bottom-6 sm:left-6">
      <CloudOff className="size-3.5" aria-hidden />
      <span>
        Offline · reports save locally, edge triage is active
      </span>
      <Wifi className="size-3 text-mist/40" aria-hidden />
    </div>
  );
}

import Link from "next/link";
import { Home, Search, Waves } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-full border border-aqua/15" />
        <span className="absolute inset-4 rounded-full border border-aqua/10" />
        <Waves className="size-8 text-aqua/70" aria-hidden />
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-aqua">
        404 · off the map
      </p>
      <h1 className="mt-3 max-w-xl font-display text-[34px] font-semibold leading-tight tracking-[-0.03em] text-foam sm:text-[44px]">
        This street is not in the pilot yet.
      </h1>
      <p className="mt-3 max-w-md text-[13px] leading-relaxed text-mist">
        The page you are looking for does not exist. The live flood map, the
        report form and the alert centre are still one click away.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-aqua px-4 py-2.5 text-[11px] font-semibold text-[#031016] transition hover:bg-[#7aecff]"
        >
          <Home className="size-3.5" aria-hidden />
          Back to dashboard
        </Link>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white/4 px-4 py-2.5 text-[11px] font-medium text-foam transition hover:border-aqua/30"
        >
          <Search className="size-3.5" aria-hidden />
          Report flooding
        </Link>
      </div>
    </div>
  );
}

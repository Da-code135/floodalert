import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="FloodAlert home"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        className,
      )}
    >
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[11px] border border-aqua/30 bg-aqua/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_-6px_rgba(62,224,255,0.45)]">
        <span className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_20%,rgba(62,224,255,0.35),transparent_60%)]" />
        <svg
          viewBox="0 0 32 32"
          className="relative size-6"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 20c3.2 0 3.8-9.5 7.2-9.5S14.8 20 18 20s4.3-9.5 7.6-9.5c1.5 0 2.3 2.2 2.4 4.2"
            stroke="#8BEEFF"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M4.4 25.2c3.1 0 3.7-4.4 7-4.4s3.5 4.4 6.7 4.4 4.2-4.4 7.4-4.4c1.4 0 2.1 1 2.2 2"
            stroke="#B9F45B"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="8.2" cy="11" r="1.2" fill="#3EE0FF" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[19px] font-semibold tracking-[-0.03em] text-foam">
            Flood<span className="text-aqua">Alert</span>
          </span>
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-mist/80">
            Kampala flood warning
          </span>
        </span>
      )}
    </Link>
  );
}

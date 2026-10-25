import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import type { ReportStatus, Severity } from "@/lib/types";
import { SEVERITY_STYLES, STATUS_STYLES } from "@/lib/format";

export function Panel({
  children,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Component
      className={cn(
        "glass rounded-2xl border border-line/90 inner-glow",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function SeverityBadge({
  severity,
  size = "sm",
  withDot = true,
  className,
}: {
  severity: Severity;
  size?: "xs" | "sm" | "md";
  withDot?: boolean;
  className?: string;
}) {
  const style = SEVERITY_STYLES[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        style.bg,
        style.border,
        style.text,
        size === "xs" && "px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]",
        size === "sm" && "px-2 py-1 text-[10px] uppercase tracking-[0.08em]",
        size === "md" && "px-2.5 py-1.5 text-xs",
        className,
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", style.dot)} />}
      {style.label}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em]",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-white/4 px-2.5 py-1 text-[10px] font-medium text-mist",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      id={id}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="h-px w-6 bg-aqua/60" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foam sm:text-[26px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-mist">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Alert centre",
  description:
    "Verify community flood reports and broadcast bilingual SMS, WhatsApp, app push and radio alerts to Kampala's last-mile subscriber circles.",
};

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return children;
}

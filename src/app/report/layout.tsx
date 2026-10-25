import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Report flooding",
  description:
    "Report flooding in Kampala in 20 seconds. Add a photo, landmark and water depth; Gemini or the offline edge model triages it and drafts a bilingual alert.",
};

export default function ReportLayout({ children }: { children: ReactNode }) {
  return children;
}

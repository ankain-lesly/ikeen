import type { Metadata } from "next";
import { DownloadView } from "@/components/download/download-view";

export const metadata: Metadata = {
  title: "Download iKeen · Android, iOS & Web",
  description:
    "Get iKeen on your devices. Private, local-first notes with biometric locks and an autonomous AI thinking partner.",
  openGraph: {
    title: "Download iKeen — Private Notes & AI Thought Partner",
    description:
      "Get iKeen on your devices. Write everything. Keep it yours.",
  },
};

export default function DownloadPage() {
  return <DownloadView />;
}

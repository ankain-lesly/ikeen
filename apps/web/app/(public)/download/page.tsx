import type { Metadata } from "next";
import { DownloadView } from "@/components/public/download-view";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Get iKeen on Android, iOS, Windows Desktop, or open the Web Workspace instantly. Write everything. Keep it yours.",
  alternates: {
    canonical: "/download",
  },
  openGraph: {
    title: "Download iKeen — Android, iOS, Desktop & Web",
    description:
      "Write everything. Keep it yours. Personal notes, folders, and Scratchpad synced across all your devices.",
    url: "/download",
  },
};

export default function DownloadPage() {
  return <DownloadView />;
}

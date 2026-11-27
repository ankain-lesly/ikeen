import type { Metadata } from "next";
import { fetchPublicShareServer } from "@/lib/api/shares.api";
import { SharedNoteView } from "@/components/public/shared-note-view";

export const dynamic = "force-dynamic";

interface SharedNotePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SharedNotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublicShareServer(slug);

  const title =
    result.status === "ok"
      ? result.data.title || "Shared Note"
      : result.status === "locked"
        ? "Protected Note"
        : "Shared Note";

  const description =
    result.status === "ok"
      ? `Shared by ${result.data.author.firstName} (@${result.data.author.username}) on iKeen.`
      : "View this shared note on iKeen.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function SharedNotePage({ params }: SharedNotePageProps) {
  const { slug } = await params;
  const result = await fetchPublicShareServer(slug);

  return <SharedNoteView slug={slug} initialState={result} />;
}

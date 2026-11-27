import { ImageResponse } from "next/og";
import { fetchPublicShareServer } from "@/lib/api/shares.api";

export const alt = "Shared Note · iKeen";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface OgImageProps {
  params: Promise<{ slug: string }>;
}

export default async function OpenGraphImage({ params }: OgImageProps) {
  const { slug } = await params;
  const result = await fetchPublicShareServer(slug);

  const heading =
    result.status === "ok"
      ? result.data.title || "Untitled Note"
      : result.status === "locked"
        ? "Protected Shared Note"
        : "Shared Note";

  const subtitle =
    result.status === "ok"
      ? `Shared by ${result.data.author.firstName} (@${result.data.author.username})`
      : result.status === "locked"
        ? "Passcode required to view"
        : "iKeen Personal Notes & Workspace";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#0A0A0A",
          color: "#F2F5EF",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: 72,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />

        <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
          <div
            style={{
              alignItems: "center",
              background: "#39FF14",
              borderRadius: 12,
              color: "#071006",
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              height: 44,
              justifyContent: "center",
              width: 44,
            }}
          >
            iK
          </div>
          <div
            style={{
              color: "#F2F5EF",
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            iKeen
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {heading.slice(0, 80)}
          </div>
          <div
            style={{
              color: "#A1A79E",
              display: "flex",
              fontSize: 28,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            color: "#6E756B",
            display: "flex",
            fontSize: 20,
          }}
        >
          Write everything. Keep it yours.
        </div>
      </div>
    ),
    { ...size },
  );
}

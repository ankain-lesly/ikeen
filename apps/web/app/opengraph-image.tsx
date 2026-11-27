import { ImageResponse } from "next/og";

export const alt = "iKeen — Write everything. Keep it yours.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
              "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 16,
          }}
        >
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
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            iKeen Workspace
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -4.5,
            lineHeight: 0.95,
          }}
        >
          <span>Write everything.</span>
          <span style={{ color: "#39FF14" }}>Keep it yours.</span>
        </div>

        <div
          style={{
            color: "#92998F",
            display: "flex",
            fontSize: 18,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Web Workspace · Android · iOS · Desktop · Scratchpad
        </div>
      </div>
    ),
    size,
  );
}

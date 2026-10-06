import { ImageResponse } from "next/og";

export const alt = "iKeen — Personal Notes & AI Workspace";
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
              "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            color: "#39FF14",
            display: "flex",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: -0.5,
          }}
        >
          ikeen / notes &amp; mcp workspace
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 90,
            fontWeight: 600,
            letterSpacing: -5,
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
          Local-First Notes / Autonomous AI Agent / MCP Server
        </div>
      </div>
    ),
    size,
  );
}

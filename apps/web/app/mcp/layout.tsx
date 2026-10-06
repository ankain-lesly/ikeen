import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Showcase & Tool Registry",
  description:
    "Explore iKeen Model Context Protocol (MCP) tool definitions, live server endpoints, and agent integration guides.",
};

export default function McpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

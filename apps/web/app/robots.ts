import { xenv } from "@/lib/env.client";
import type { MetadataRoute } from "next";

const baseUrl = xenv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/mcp", "/privacy", "/delete-account", "/dashboard"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

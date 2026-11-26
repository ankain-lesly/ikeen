import { xenv } from "@/lib/env.client";
import type { MetadataRoute } from "next";

const baseUrl = xenv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/privacy", "/delete-account"],
        disallow: ["/app/", "/legacy/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

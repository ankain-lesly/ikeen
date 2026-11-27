import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const packageName =
    process.env.ANDROID_PACKAGE_NAME?.trim() || "com.techforgelee.ikeen";
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((fp) => fp.trim())
    .filter(Boolean);

  const payload = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

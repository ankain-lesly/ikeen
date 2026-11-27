import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim() || "TEAMID";
  const bundleId =
    process.env.IOS_BUNDLE_ID?.trim() || "com.techforgelee.ikeen";

  const payload = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${bundleId}`],
          components: [
            {
              "/": "/s/*",
              comment: "Open shared iKeen notes in the native iOS app",
            },
          ],
        },
      ],
    },
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

import { NextResponse } from "next/server";

import packageJson from "@/package.json";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-dynamic";

function getVersion() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA;

  return {
    commitSha: commitSha ? commitSha.slice(0, 7) : undefined,
    packageVersion: packageJson.version,
  };
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    appName: siteConfig.productName,
    environment: process.env.NODE_ENV || "development",
    version: getVersion(),
  });
}

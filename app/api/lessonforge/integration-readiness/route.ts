import { NextResponse } from "next/server";

import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";

export async function GET() {
  return NextResponse.json(getIntegrationReadiness());
}

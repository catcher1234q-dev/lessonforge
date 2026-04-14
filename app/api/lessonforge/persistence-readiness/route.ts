import { NextResponse } from "next/server";

import { getCurrentViewer } from "@/lib/auth/viewer";
import { handlePersistenceReadinessRequest } from "@/lib/lessonforge/api-handlers";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";

export async function GET() {
  const viewer = await getCurrentViewer();
  const response = await handlePersistenceReadinessRequest(viewer.role, {
    getPersistenceReadiness,
  });
  return NextResponse.json(response.body, { status: response.status });
}

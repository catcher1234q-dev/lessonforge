import { NextResponse } from "next/server";

import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { handlePersistenceReadinessRequest } from "@/lib/lessonforge/api-handlers";
import { getPersistenceReadiness } from "@/lib/lessonforge/persistence-readiness";

export async function GET() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const response = await handlePersistenceReadinessRequest("owner", {
    getPersistenceReadiness,
  });
  return NextResponse.json(response.body, { status: response.status });
}

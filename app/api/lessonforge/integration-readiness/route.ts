import { NextResponse } from "next/server";

import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { getIntegrationReadiness } from "@/lib/lessonforge/integration-readiness";

export async function GET() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  return NextResponse.json(getIntegrationReadiness());
}

import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { normalizePlanKey } from "@/lib/config/plans";
import { trackMonetizationEvent } from "@/lib/lessonforge/data-access";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in access required." }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventType?:
      | "listing_limit_hit"
      | "ai_credit_limit_hit"
      | "locked_feature_clicked"
      | "upgrade_click";
    source?: "seller_creator" | "seller_dashboard" | "seller_editor" | "pricing" | "unknown";
    planKey?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.eventType) {
    return NextResponse.json({ error: "Event type is required." }, { status: 400 });
  }

  const event = await trackMonetizationEvent({
    sellerId: viewer.email,
    sellerEmail: viewer.email,
    planKey: normalizePlanKey(body.planKey),
    eventType: body.eventType,
    source: body.source ?? "unknown",
    metadata: body.metadata,
  });

  return NextResponse.json({ event });
}

import { NextResponse } from "next/server";

import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  getAdminAiSettings,
  updateAdminAiSettings,
} from "@/lib/lessonforge/data-access";
import type { AdminAiSettings } from "@/types";

export async function GET() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const settings = await getAdminAiSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  try {
    const ownerAccess = await getOwnerAccessContext();

    if (!ownerAccess.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can update AI settings." },
        { status: 403 },
      );
    }

    const rateLimit = checkAdminMutationRateLimit({
      actorEmail: ownerAccess.authenticatedEmail ?? "owner@lessonforge.local",
      actorRole: "owner",
      actionKey: "ai-settings",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit reached for AI control changes. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      aiKillSwitchEnabled?: boolean;
      warningThresholds?: AdminAiSettings["warningThresholds"];
    };

    const settings = await updateAdminAiSettings({
      aiKillSwitchEnabled: body.aiKillSwitchEnabled,
      warningThresholds: body.warningThresholds,
    }, {
      email: ownerAccess.authenticatedEmail ?? "owner@lessonforge.local",
      role: "owner",
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update admin AI settings.",
      },
      { status: 500 },
    );
  }
}

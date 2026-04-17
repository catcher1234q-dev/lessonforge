import { NextResponse } from "next/server";

import { getCurrentViewer } from "@/lib/auth/viewer";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  getAdminAiSettings,
  updateAdminAiSettings,
} from "@/lib/lessonforge/data-access";
import type { AdminAiSettings } from "@/types";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const settings = await getAdminAiSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getCurrentViewer();

    if (viewer.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can update AI settings." },
        { status: 403 },
      );
    }

    const rateLimit = checkAdminMutationRateLimit({
      actorEmail: viewer.email,
      actorRole: viewer.role,
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
      email: viewer.email,
      role: viewer.role,
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

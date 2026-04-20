import { NextResponse } from "next/server";

import { getOwnerAccessContext } from "@/lib/auth/owner-access";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/lessonforge/data-access";

export async function GET() {
  const ownerAccess = await getOwnerAccessContext();

  if (!ownerAccess.isOwner) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  const settings = await getSystemSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  try {
    const ownerAccess = await getOwnerAccessContext();

    if (!ownerAccess.isOwner) {
      return NextResponse.json(
        { error: "Only the owner can update system settings." },
        { status: 403 },
      );
    }

    const rateLimit = checkAdminMutationRateLimit({
      actorEmail: ownerAccess.authenticatedEmail ?? "owner@lessonforge.local",
      actorRole: "owner",
      actionKey: "system-settings",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit reached for system control changes. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      maintenanceModeEnabled?: boolean;
      maintenanceMessage?: string;
    };

    const settings = await updateSystemSettings({
      maintenanceModeEnabled: body.maintenanceModeEnabled,
      maintenanceMessage: body.maintenanceMessage,
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
            : "Unable to update system settings.",
      },
      { status: 500 },
    );
  }
}

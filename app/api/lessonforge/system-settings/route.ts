import { NextResponse } from "next/server";

import { getCurrentViewer } from "@/lib/auth/viewer";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/lessonforge/repository";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const settings = await getSystemSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getCurrentViewer();

    if (viewer.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can update system settings." },
        { status: 403 },
      );
    }

    const rateLimit = checkAdminMutationRateLimit({
      actorEmail: viewer.email,
      actorRole: viewer.role,
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
            : "Unable to update system settings.",
      },
      { status: 500 },
    );
  }
}

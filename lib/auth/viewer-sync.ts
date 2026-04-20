"use client";

import type { Session } from "@supabase/supabase-js";

import type { Viewer, ViewerRole } from "@/types";

function getViewerIdentity(session: Session) {
  const fullName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email ||
    "Teacher";

  return {
    name: String(fullName),
    email: session.user.email || "buyer@lessonforge.demo",
    sellerDisplayName: String(fullName),
  };
}

export async function syncViewerCookie(options?: {
  role?: ViewerRole;
  session?: Session | null;
  preserveCurrentRole?: boolean;
}) {
  let nextRole = options?.role;

  if (!nextRole && options?.preserveCurrentRole) {
    try {
      const currentResponse = await fetch("/api/session/viewer");
      const currentPayload = (await currentResponse.json()) as {
        viewer?: Viewer;
        allowedRoles?: ViewerRole[];
      };

      if (currentResponse.ok) {
        const allowedRoles = currentPayload.allowedRoles?.length
          ? currentPayload.allowedRoles
          : ["buyer", "seller"];
        const currentRole = currentPayload.viewer?.role;

        nextRole =
          currentRole && allowedRoles.includes(currentRole) ? currentRole : "buyer";
      }
    } catch {
      nextRole = "buyer";
    }
  }

  const resolvedRole = nextRole ?? "buyer";
  const identity =
    options?.session && (resolvedRole === "buyer" || resolvedRole === "seller")
      ? getViewerIdentity(options.session)
      : null;
  const accessToken = options?.session?.access_token ?? null;

  const response = await fetch("/api/session/viewer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: resolvedRole,
      ...(identity ?? {}),
      ...(accessToken ? { accessToken } : {}),
    }),
  });

  if (options?.session?.user.email) {
    await fetch("/api/session/app-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: options.session.user.email,
        accessToken: options.session.access_token,
      }),
    });
  } else {
    await fetch("/api/session/app-auth", {
      method: "DELETE",
    });
  }

  const payload = (await response.json()) as { viewer?: Viewer };
  return payload.viewer ?? null;
}

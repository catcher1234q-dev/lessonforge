import "server-only";

import { UserRole } from "@prisma/client";

import { getAppSessionEmail } from "@/lib/auth/app-session";
import { env } from "@/lib/config/env";
import { hasRealDatabaseUrl, prisma } from "@/lib/prisma/client";
import { getSupabaseServerUser } from "@/lib/supabase/server-auth";

export type OwnerAccessSource = "env" | "database" | null;

export type OwnerAccessContext = {
  authenticatedEmail: string | null;
  configuredOwnerEmail: string | null;
  isOwner: boolean;
  source: OwnerAccessSource;
};

function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

async function getOwnerRoleFromDatabase(email: string) {
  if (!hasRealDatabaseUrl()) {
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    return user?.role === UserRole.OWNER;
  } catch {
    return false;
  }
}

export async function getAuthenticatedAccountEmail() {
  const supabaseUser = await getSupabaseServerUser();
  const supabaseEmail = normalizeEmail(supabaseUser?.email);

  if (supabaseEmail) {
    return supabaseEmail;
  }

  return normalizeEmail(await getAppSessionEmail());
}

export async function getOwnerAccessContext(): Promise<OwnerAccessContext> {
  const authenticatedEmail = await getAuthenticatedAccountEmail();
  const configuredOwnerEmail = normalizeEmail(env.OWNER_EMAIL);

  if (!authenticatedEmail) {
    return {
      authenticatedEmail: null,
      configuredOwnerEmail,
      isOwner: false,
      source: null,
    };
  }

  if (configuredOwnerEmail && authenticatedEmail === configuredOwnerEmail) {
    return {
      authenticatedEmail,
      configuredOwnerEmail,
      isOwner: true,
      source: "env",
    };
  }

  if (await getOwnerRoleFromDatabase(authenticatedEmail)) {
    return {
      authenticatedEmail,
      configuredOwnerEmail,
      isOwner: true,
      source: "database",
    };
  }

  return {
    authenticatedEmail,
    configuredOwnerEmail,
    isOwner: false,
    source: null,
  };
}

export async function hasOwnerPlatformAccess() {
  const context = await getOwnerAccessContext();
  return context.isOwner;
}

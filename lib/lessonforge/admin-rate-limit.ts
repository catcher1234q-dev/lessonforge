import type { ViewerRole } from "@/types";

const ADMIN_MUTATION_WINDOW_MS = 60_000;
const ADMIN_MUTATION_LIMIT = 12;
const OWNER_MUTATION_LIMIT = 20;

const mutationHistory = new Map<string, number[]>();

export function getAdminMutationLimit(role?: ViewerRole) {
  return role === "owner" ? OWNER_MUTATION_LIMIT : ADMIN_MUTATION_LIMIT;
}

export function checkAdminMutationRateLimit(input: {
  actorEmail?: string;
  actorRole?: ViewerRole;
  actionKey: string;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const actorKey = `${input.actorRole ?? "unknown"}:${input.actorEmail ?? "unknown"}:${input.actionKey}`;
  const limit = getAdminMutationLimit(input.actorRole);
  const existing = mutationHistory.get(actorKey) ?? [];
  const active = existing.filter((timestamp) => now - timestamp < ADMIN_MUTATION_WINDOW_MS);

  if (active.length >= limit) {
    const oldestActive = active[0];
    const retryAfterMs = Math.max(1_000, ADMIN_MUTATION_WINDOW_MS - (now - oldestActive));
    mutationHistory.set(actorKey, active);

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
    };
  }

  active.push(now);
  mutationHistory.set(actorKey, active);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function resetAdminMutationRateLimitForTests() {
  mutationHistory.clear();
}

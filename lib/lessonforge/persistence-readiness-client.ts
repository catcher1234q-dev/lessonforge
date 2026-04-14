import {
  isPersistenceReadiness,
  isPersistenceReadinessError,
  type PersistenceReadiness,
  type PersistenceReadinessApiResponse,
} from "@/lib/lessonforge/persistence-readiness-contract";

const DEFAULT_ERROR_MESSAGE = "Unable to refresh persistence status.";
export const PERSISTENCE_READINESS_API_PATH =
  "/api/lessonforge/persistence-readiness";

export async function parsePersistenceReadinessResponse(
  response: Pick<Response, "ok" | "json">,
): Promise<PersistenceReadiness> {
  const payload = (await response.json().catch(() => null)) as
    | PersistenceReadinessApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload && isPersistenceReadinessError(payload)
        ? payload.error
        : DEFAULT_ERROR_MESSAGE,
    );
  }

  if (!payload || isPersistenceReadinessError(payload) || !isPersistenceReadiness(payload)) {
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }

  return payload;
}

export async function fetchPersistenceReadiness(
  fetchImpl: typeof fetch = fetch,
): Promise<PersistenceReadiness> {
  const response = await fetchImpl(PERSISTENCE_READINESS_API_PATH, {
    cache: "no-store",
  });

  return parsePersistenceReadinessResponse(response);
}

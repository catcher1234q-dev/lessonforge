type AiRouteErrorClassification = {
  status: number;
  userMessage: string;
  reason: string;
};

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "Unknown error";
}

export function classifyAiRouteError(error: unknown): AiRouteErrorClassification {
  const message = normalizeErrorMessage(error);

  if (/atomic ai credit reservation|credit reservation is temporarily unavailable/i.test(message)) {
    return {
      status: 503,
      userMessage: "AI is temporarily unavailable right now.",
      reason: "credit_reservation_unavailable",
    };
  }

  if (/signed-in seller access required/i.test(message)) {
    return {
      status: 401,
      userMessage: "Sign in to your seller account to use AI.",
      reason: "seller_access_missing",
    };
  }

  if (/seller access required|only run ai for your own seller account/i.test(message)) {
    return {
      status: 403,
      userMessage: "Seller access required to use AI.",
      reason: "seller_access_forbidden",
    };
  }

  if (/not enough ai credits/i.test(message)) {
    return {
      status: 402,
      userMessage: "You do not have enough AI credits for this action.",
      reason: "credits_exhausted",
    };
  }

  if (/temporarily unavailable|kill switch/i.test(message)) {
    return {
      status: 503,
      userMessage: "AI is temporarily unavailable right now.",
      reason: "ai_temporarily_unavailable",
    };
  }

  if (
    /timed out|aborterror|did not return usable content|request failed|provider error|unavailable right now/i.test(
      message,
    )
  ) {
    return {
      status: 503,
      userMessage: "AI could not finish this right now. Try again.",
      reason: "ai_provider_failure",
    };
  }

  if (
    /database server|unable to load ai usage|unable to record ai usage|unable to refund ai usage|unable to load supabase ai usage ledger/i.test(
      message,
    )
  ) {
    return {
      status: 503,
      userMessage: "AI is temporarily unavailable right now.",
      reason: "database_failure",
    };
  }

  if (/public\.user|relation "user"|table `public\.user`/i.test(message)) {
    return {
      status: 503,
      userMessage: "AI is temporarily unavailable right now.",
      reason: "database_missing_table",
    };
  }

  return {
    status: 500,
    userMessage: "AI could not finish this right now. Try again.",
    reason: "unknown_failure",
  };
}

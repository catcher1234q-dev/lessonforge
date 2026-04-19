import assert from "node:assert/strict";
import test from "node:test";

import { classifyAiRouteError } from "@/lib/lessonforge/ai-route-errors";

test("classifyAiRouteError marks seller access failures correctly", () => {
  const result = classifyAiRouteError(new Error("Signed-in seller access required."));

  assert.equal(result.status, 401);
  assert.equal(result.reason, "seller_access_missing");
  assert.equal(result.userMessage, "Sign in to your seller account to use AI.");
});

test("classifyAiRouteError marks exhausted credits correctly", () => {
  const result = classifyAiRouteError(new Error("Not enough AI credits remaining for this action."));

  assert.equal(result.status, 402);
  assert.equal(result.reason, "credits_exhausted");
  assert.equal(result.userMessage, "You do not have enough AI credits for this action.");
});

test("classifyAiRouteError marks database failures as temporary unavailability", () => {
  const result = classifyAiRouteError(
    new Error("Can't reach database server at db.nhdlsdihxvoxzdizvjub.supabase.co:5432"),
  );

  assert.equal(result.status, 503);
  assert.equal(result.reason, "database_failure");
  assert.equal(result.userMessage, "AI is temporarily unavailable right now.");
});

test("classifyAiRouteError marks provider failures as retryable", () => {
  const result = classifyAiRouteError(new Error("Gemini did not return usable content."));

  assert.equal(result.status, 503);
  assert.equal(result.reason, "ai_provider_failure");
  assert.equal(result.userMessage, "AI could not finish this right now. Try again.");
});

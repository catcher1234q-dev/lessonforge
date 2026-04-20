import assert from "node:assert/strict";
import test from "node:test";

import { handleListingAssistRequest } from "@/lib/lessonforge/listing-assist-handler";
import type { ListingAssistResult } from "@/lib/ai/providers";

const sampleSuggestion: ListingAssistResult = {
  provider: "openai",
  status: "success",
  message: "Generated with OpenAI.",
  title: "Fractions Exit Ticket Pack",
  shortDescription: "Quick fraction checks teachers can print and use right away.",
  fullDescription:
    "This fractions resource gives teachers a ready-to-use set of exit tickets, answer keys, and simple progress checks for upper elementary math review.",
  subject: "Math",
  gradeBand: "3-5",
  tags: ["fractions", "exit tickets", "upper elementary"],
};

test("listing assist blocks insufficient credits before the provider call starts", async () => {
  let providerCalled = false;
  let refundCalled = false;

  const response = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-insufficient",
    },
    {
      getAdminAiSettings: async () => ({
        aiKillSwitchEnabled: false,
        warningThresholds: { starter: 70, basic: 80, pro: 85 },
        updatedAt: "2026-04-18T00:00:00.000Z",
      }),
      consumeCredits: async () => {
        throw new Error("Not enough AI credits remaining for this action.");
      },
      refundCredits: async () => {
        refundCalled = true;
      },
      findListingAssistCacheEntry: async () => null,
      saveListingAssistCacheEntry: async () => null,
      suggestListingWithOpenAI: async () => {
        providerCalled = true;
        return sampleSuggestion;
      },
      suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 402);
  assert.deepEqual(response.body, { error: "You do not have enough AI credits for this action." });
  assert.equal(providerCalled, false);
  assert.equal(refundCalled, false);
});

test("listing assist returns the cached result for a reused idempotency key", async () => {
  let providerCalled = false;
  let saveCalled = false;

  const response = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-reused-cached",
    },
    {
      getAdminAiSettings: async () => ({
        aiKillSwitchEnabled: false,
        warningThresholds: { starter: 70, basic: 80, pro: 85 },
        updatedAt: "2026-04-18T00:00:00.000Z",
      }),
      consumeCredits: async () => ({
        subscription: { availableCredits: 96 },
        reservationState: "reused" as const,
      }),
      refundCredits: async () => undefined,
      findListingAssistCacheEntry: async () => ({ result: sampleSuggestion }),
      saveListingAssistCacheEntry: async () => {
        saveCalled = true;
        return null;
      },
      suggestListingWithOpenAI: async () => {
        providerCalled = true;
        return sampleSuggestion;
      },
      suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    suggestion: sampleSuggestion,
    availableCredits: 96,
    cost: 2,
  });
  assert.equal(providerCalled, false);
  assert.equal(saveCalled, false);
});

test("listing assist lets the owner bypass credit reservations", async () => {
  let consumed = false;
  let refunded = false;

  const response = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-owner-bypass",
    },
    {
      ownerBypassCredits: true,
      getAdminAiSettings: async () => ({
        aiKillSwitchEnabled: false,
        warningThresholds: { starter: 70, basic: 80, pro: 85 },
        updatedAt: "2026-04-18T00:00:00.000Z",
      }),
      consumeCredits: async () => {
        consumed = true;
        return {
          subscription: { availableCredits: 96 },
          reservationState: "reserved" as const,
        };
      },
      refundCredits: async () => {
        refunded = true;
      },
      findListingAssistCacheEntry: async () => null,
      saveListingAssistCacheEntry: async () => null,
      suggestListingWithOpenAI: async () => sampleSuggestion,
      suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    suggestion: sampleSuggestion,
    availableCredits: Number.MAX_SAFE_INTEGER,
    cost: 2,
  });
  assert.equal(consumed, false);
  assert.equal(refunded, false);
});

test("listing assist blocks a reused in-flight request before running the provider again", async () => {
  let providerCalled = false;
  let refundCalled = false;

  const response = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-reused-in-flight",
    },
    {
      getAdminAiSettings: async () => ({
        aiKillSwitchEnabled: false,
        warningThresholds: { starter: 70, basic: 80, pro: 85 },
        updatedAt: "2026-04-18T00:00:00.000Z",
      }),
      consumeCredits: async () => ({
        subscription: { availableCredits: 96 },
        reservationState: "reused" as const,
      }),
      refundCredits: async () => {
        refundCalled = true;
      },
      findListingAssistCacheEntry: async () => null,
      saveListingAssistCacheEntry: async () => null,
      suggestListingWithOpenAI: async () => {
        providerCalled = true;
        return sampleSuggestion;
      },
      suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: "AI could not finish this right now. Try again." });
  assert.equal(providerCalled, false);
  assert.equal(refundCalled, false);
});

test("listing assist refunds a newly reserved credit when the provider fails", async () => {
  const refundCalls: string[] = [];

  const response = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-provider-failure",
    },
    {
      getAdminAiSettings: async () => ({
        aiKillSwitchEnabled: false,
        warningThresholds: { starter: 70, basic: 80, pro: 85 },
        updatedAt: "2026-04-18T00:00:00.000Z",
      }),
      consumeCredits: async () => ({
        subscription: { availableCredits: 96 },
        ledgerEntry: {
          id: "ledger-1",
          sellerId: "seller-1",
          action: "descriptionRewrite",
          creditsUsed: 2,
          refundedCredits: 0,
          status: "applied",
          provider: "openai",
          idempotencyKey: "listing-provider-failure",
          createdAt: "2026-04-18T00:00:00.000Z",
        },
        reservationState: "reserved" as const,
      }),
      refundCredits: async (idempotencyKey) => {
        refundCalls.push(idempotencyKey);
      },
      findListingAssistCacheEntry: async () => null,
      saveListingAssistCacheEntry: async () => null,
      suggestListingWithOpenAI: async () => {
        throw new Error("Provider request failed");
      },
      suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" }),
    },
  );

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: "AI could not finish this right now. Try again." });
  assert.deepEqual(refundCalls, ["listing-provider-failure"]);
});

test("listing assist can retry after a refunded failure without double charging", async () => {
  const refundCalls: string[] = [];
  let consumeCount = 0;
  let providerCount = 0;

  const deps = {
    getAdminAiSettings: async () => ({
      aiKillSwitchEnabled: false,
      warningThresholds: { starter: 70, basic: 80, pro: 85 },
      updatedAt: "2026-04-18T00:00:00.000Z",
    }),
    consumeCredits: async () => {
      consumeCount += 1;
      return {
        subscription: { availableCredits: consumeCount === 1 ? 96 : 94 },
        reservationState: "reserved" as const,
      };
    },
    refundCredits: async (idempotencyKey: string) => {
      refundCalls.push(idempotencyKey);
    },
    findListingAssistCacheEntry: async () => null,
    saveListingAssistCacheEntry: async () => null,
      suggestListingWithOpenAI: async () => {
        providerCount += 1;

        if (providerCount === 1) {
          throw new Error("Provider request failed");
        }

      return sampleSuggestion;
    },
    suggestListingWithGemini: async () => ({ ...sampleSuggestion, provider: "gemini" as const }),
  };

  const firstResponse = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-retry",
    },
    deps,
  );

  const secondResponse = await handleListingAssistRequest(
    {
      sellerId: "seller-1",
      sellerEmail: "seller@example.com",
      sellerPlanKey: "basic",
      provider: "openai",
      action: "autofill",
      title: "Fractions Exit Ticket Pack",
      fileNames: ["fractions.pdf"],
      idempotencyKey: "listing-retry",
    },
    deps,
  );

  assert.equal(firstResponse.status, 503);
  assert.deepEqual(firstResponse.body, { error: "AI could not finish this right now. Try again." });
  assert.equal(secondResponse.status, 200);
  assert.deepEqual(secondResponse.body, {
    suggestion: sampleSuggestion,
    availableCredits: 94,
    cost: 2,
  });
  assert.deepEqual(refundCalls, ["listing-retry"]);
  assert.equal(consumeCount, 2);
  assert.equal(providerCount, 2);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getListingAssistFieldPlan,
  getSellerCreateStep1AiUiState,
  REMOVED_LATER_STEP_AI_ACTION_LABELS,
  STEP_1_AI_BUTTON_LABEL,
  ZERO_AI_CREDITS_RESET_MESSAGE,
  ZERO_AI_CREDITS_TITLE,
} from "@/lib/lessonforge/seller-create-ai-ui";

const productCreatorSource = readFileSync(
  "/Users/mikhailtripp/Documents/New project/components/seller/product-creator.tsx",
  "utf8",
);

test("Step 1 AI button stays hidden until the uploaded file is AI-ready", () => {
  const idleState = getSellerCreateStep1AiUiState({
    aiUploadReadinessState: "idle",
    aiKillSwitchEnabled: false,
    hasAnyAiCreditsRemaining: true,
    currentAiAction: null,
  });
  const checkingState = getSellerCreateStep1AiUiState({
    aiUploadReadinessState: "checking",
    aiKillSwitchEnabled: false,
    hasAnyAiCreditsRemaining: true,
    currentAiAction: null,
  });

  assert.equal(idleState.showButton, false);
  assert.equal(checkingState.showButton, false);
});

test("Step 1 AI shows one Fill listing with AI action after upload readiness", () => {
  const readyState = getSellerCreateStep1AiUiState({
    aiUploadReadinessState: "ready",
    aiKillSwitchEnabled: false,
    hasAnyAiCreditsRemaining: true,
    currentAiAction: null,
  });

  assert.equal(readyState.showButton, true);
  assert.equal(readyState.buttonLabel, STEP_1_AI_BUTTON_LABEL);
  assert.equal(readyState.buttonDisabled, false);

  const fillButtonCount = productCreatorSource.match(/Fill listing with AI/g)?.length ?? 0;
  assert.ok(fillButtonCount >= 1);
});

test("zero-credit sellers still see the Step 1 AI button with disabled copy", () => {
  const zeroCreditsState = getSellerCreateStep1AiUiState({
    aiUploadReadinessState: "ready",
    aiKillSwitchEnabled: false,
    hasAnyAiCreditsRemaining: false,
    currentAiAction: null,
  });

  assert.equal(zeroCreditsState.showButton, true);
  assert.equal(zeroCreditsState.buttonDisabled, true);
  assert.equal(zeroCreditsState.showZeroCreditsMessage, true);
  assert.equal(zeroCreditsState.zeroCreditsTitle, ZERO_AI_CREDITS_TITLE);
  assert.equal(
    zeroCreditsState.zeroCreditsResetMessage,
    ZERO_AI_CREDITS_RESET_MESSAGE,
  );
  assert.match(productCreatorSource, /zeroCreditsTitle/);
  assert.match(productCreatorSource, /zeroCreditsResetMessage/);
});

test("legacy later-step AI helper labels stay out of the seller create flow", () => {
  for (const label of REMOVED_LATER_STEP_AI_ACTION_LABELS) {
    assert.equal(
      productCreatorSource.includes(label),
      false,
      `${label} should not reappear in the seller create UI`,
    );
  }
});

test("AI autofill plan preserves strong manual edits while still allowing tag suggestions", () => {
  const result = getListingAssistFieldPlan({
    action: "autofill",
    mode: "helper",
    current: {
      title: "Teacher-Built Decimal Small-Group Toolkit",
      shortDescription:
        "Students practice decimal addition and subtraction with clear visual models.",
      fullDescription:
        "This classroom-ready small-group toolkit includes worked examples, guided practice, and an exit slip teachers can use right away.",
      subject: "ELA",
      gradeBand: "6-8",
      suggestedTags: [],
    },
    uploadedTitle: "Uploaded Decimal Notes",
    suggestion: {
      title: "AI replacement title",
      shortDescription: "AI replacement short description",
      fullDescription: "AI replacement full description that should not override manual edits.",
      subject: "Science",
      gradeBand: "K-12",
      tags: ["decimal practice", "small group intervention"],
    },
  });

  assert.deepEqual(result.nextValues, {
    tags: ["decimal practice", "small group intervention"],
  });
  assert.deepEqual(result.nextUpdatedFields, {
    tags: "suggested",
  });
});

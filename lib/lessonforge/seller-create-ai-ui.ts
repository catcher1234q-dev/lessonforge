export type SellerCreateAiUploadReadinessState =
  | "idle"
  | "checking"
  | "ready"
  | "error";

export type SellerCreateCurrentAiAction = string | null;

export const STEP_1_AI_BUTTON_LABEL = "Fill listing with AI";
export const ZERO_AI_CREDITS_TITLE = "No AI credits remaining";
export const ZERO_AI_CREDITS_RESET_MESSAGE =
  "Credits reset with your monthly billing cycle.";

export const REMOVED_LATER_STEP_AI_ACTION_LABELS = [
  "Generate title",
  "Write description",
  "Generate tags",
  "Scan standards",
] as const;

export function getSellerCreateStep1AiUiState(input: {
  aiUploadReadinessState: SellerCreateAiUploadReadinessState;
  aiKillSwitchEnabled: boolean;
  hasAnyAiCreditsRemaining: boolean;
  currentAiAction: SellerCreateCurrentAiAction;
}) {
  const showButton = input.aiUploadReadinessState === "ready";
  const buttonDisabled =
    input.currentAiAction !== null ||
    input.aiKillSwitchEnabled ||
    !input.hasAnyAiCreditsRemaining;

  return {
    showButton,
    buttonLabel: STEP_1_AI_BUTTON_LABEL,
    buttonDisabled,
    showZeroCreditsMessage: showButton && !input.hasAnyAiCreditsRemaining,
    zeroCreditsTitle: ZERO_AI_CREDITS_TITLE,
    zeroCreditsResetMessage: ZERO_AI_CREDITS_RESET_MESSAGE,
  };
}

type ListingAssistAction = "autofill" | "title" | "description" | "tags";
type AiFieldKey =
  | "title"
  | "shortDescription"
  | "fullDescription"
  | "subject"
  | "gradeBand"
  | "tags";

type ListingAssistSuggestion = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  gradeBand: string;
  tags: string[];
};

function isWeakTitleValue(value: string, uploadedTitle: string) {
  const normalized = value.trim();

  return !normalized || normalized === uploadedTitle || normalized.length < 12;
}

function isWeakShortDescriptionValue(value: string) {
  return value.trim().length < 20;
}

function isWeakFullDescriptionValue(value: string) {
  return value.trim().length < 60;
}

export function getListingAssistFieldPlan(input: {
  action: ListingAssistAction;
  mode: "upload" | "helper" | "manual";
  current: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    subject: string;
    gradeBand: string;
    suggestedTags: string[];
  };
  uploadedTitle: string;
  suggestion: ListingAssistSuggestion;
}) {
  const nextUpdatedFields: Partial<Record<AiFieldKey, "filled" | "suggested">> = {};
  const nextValues: Partial<
    Pick<
      ListingAssistSuggestion,
      "title" | "shortDescription" | "fullDescription" | "subject" | "gradeBand" | "tags"
    >
  > = {};

  const shouldHelpTitle =
    input.mode === "helper"
      ? isWeakTitleValue(input.current.title, input.uploadedTitle)
      : !input.current.title.trim() || input.current.title.trim() === input.uploadedTitle;
  const shouldHelpShortDescription =
    input.mode === "helper"
      ? isWeakShortDescriptionValue(input.current.shortDescription)
      : !input.current.shortDescription.trim();
  const shouldHelpFullDescription =
    input.mode === "helper"
      ? isWeakFullDescriptionValue(input.current.fullDescription)
      : !input.current.fullDescription.trim();

  if (input.action === "autofill" && shouldHelpTitle) {
    nextValues.title = input.suggestion.title;
    nextUpdatedFields.title = "filled";
  }

  if (input.action === "title") {
    nextValues.title = input.suggestion.title;
    nextUpdatedFields.title = "filled";
  }

  if (
    (input.action === "autofill" || input.action === "description") &&
    shouldHelpShortDescription
  ) {
    nextValues.shortDescription = input.suggestion.shortDescription;
    nextUpdatedFields.shortDescription = "filled";
  }

  if (input.action === "description") {
    if (
      input.current.shortDescription.trim() !== input.suggestion.shortDescription.trim()
    ) {
      nextValues.shortDescription = input.suggestion.shortDescription;
      nextUpdatedFields.shortDescription = "filled";
    }

    nextValues.fullDescription = input.suggestion.fullDescription;
    nextUpdatedFields.fullDescription = "filled";
  }

  if (input.action === "autofill" && shouldHelpFullDescription) {
    nextValues.fullDescription = input.suggestion.fullDescription;
    nextUpdatedFields.fullDescription = "filled";
  }

  if (input.action === "autofill") {
    if (input.current.subject === "Math" && input.suggestion.subject !== input.current.subject) {
      nextValues.subject = input.suggestion.subject;
      nextUpdatedFields.subject = "filled";
    }

    if (
      input.current.gradeBand === "K-12" &&
      input.suggestion.gradeBand !== input.current.gradeBand
    ) {
      nextValues.gradeBand = input.suggestion.gradeBand;
      nextUpdatedFields.gradeBand = "filled";
    }
  }

  if (
    (input.action === "autofill" || input.action === "tags") &&
    input.current.suggestedTags.length === 0
  ) {
    nextValues.tags = input.suggestion.tags;
    nextUpdatedFields.tags = "suggested";
  } else if (input.action === "tags") {
    nextValues.tags = input.suggestion.tags;
    nextUpdatedFields.tags = "suggested";
  }

  return {
    nextValues,
    nextUpdatedFields,
  };
}

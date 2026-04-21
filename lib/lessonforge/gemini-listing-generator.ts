import "server-only";

import { mapStandardsWithGemini } from "@/lib/ai/providers";

export type GeneratedListingSuggestion = {
  titleOptions: string[];
  shortDescription: string;
  fullDescriptionOptions: string[];
  tags: string[];
  subject: string;
  gradeBand: string;
  standardsTag: string;
  standardsConfidence: string;
  standardsRationale: string;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || "55000");

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function limitText(value: string, maxLength = 12_000) {
  return value.trim().slice(0, maxLength);
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject<T>(value: string) {
  const cleaned = stripCodeFence(value);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return usable content.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTitleOptions(value: unknown, fallbackTitle: string) {
  const options = Array.isArray(value)
    ? value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];

  const deduped = Array.from(new Set(options));

  while (deduped.length < 3) {
    const nextIndex = deduped.length + 1;
    deduped.push(
      nextIndex === 1
        ? fallbackTitle
        : `${fallbackTitle} ${nextIndex === 2 ? "Resource Pack" : "Classroom Practice Set"}`,
    );
  }

  return deduped.slice(0, 3);
}

function normalizeDescriptionOptions(value: unknown, fallbackDescription: string) {
  const options = Array.isArray(value)
    ? value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];

  const deduped = Array.from(new Set(options));

  while (deduped.length < 2) {
    deduped.push(fallbackDescription);
  }

  return deduped.slice(0, 2);
}

function normalizeTagList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

function normalizeSubject(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (["Math", "ELA", "Science", "Social Studies"].includes(normalized)) {
    return normalized;
  }
  return "Math";
}

function normalizeGradeBand(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (["K-2", "3-5", "K-5", "6-8", "9-12", "K-12"].includes(normalized)) {
    return normalized;
  }
  return "K-5";
}

function buildFallbackTitle(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || "Teacher Resource";
}

function buildPrompt(input: {
  fileName: string;
  pageCount: number;
  extractedText: string;
  variationSeed?: number;
  currentTitle?: string;
  currentDescription?: string;
}) {
  return [
    "You help teacher sellers create polished marketplace listings from uploaded classroom resources.",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "titleOptions": ["", "", ""],',
    '  "shortDescription": "",',
    '  "fullDescriptionOptions": ["", ""],',
    '  "tags": ["", "", ""],',
    '  "subject": "",',
    '  "gradeBand": ""',
    "}",
    'subject must be one of: "Math", "ELA", "Science", "Social Studies".',
    'gradeBand must be one of: "K-2", "3-5", "K-5", "6-8", "9-12", "K-12".',
    "Write for a real teacher marketplace.",
    "Be specific, teacher-friendly, and easy to edit.",
    "Do not invent standards, sales claims, classroom outcomes, or formats that are not visible in the file.",
    "Keep title options distinct but all credible for sale.",
    "The shortDescription should be one strong sentence.",
    "Each fullDescription should explain what the resource teaches, what is included, who it is for, and how a teacher uses it.",
    `Variation seed: ${input.variationSeed ?? 0}`,
    `Uploaded file name: ${input.fileName}`,
    `Detected page count: ${input.pageCount}`,
    `Current title hint: ${limitText(input.currentTitle || "")}`,
    `Current description hint: ${limitText(input.currentDescription || "")}`,
    `Extracted file text: ${limitText(input.extractedText)}`,
  ].join("\n");
}

export async function generateListingFromFileWithGemini(input: {
  fileName: string;
  pageCount: number;
  extractedText: string;
  currentTitle?: string;
  currentDescription?: string;
  variationSeed?: number;
}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini is unavailable right now.");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generation_config: {
          temperature: 0.3,
          media_resolution: "MEDIA_RESOLUTION_LOW",
        },
      }),
    },
    GEMINI_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Gemini request failed.");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");

  if (!content) {
    throw new Error("Gemini did not return usable content.");
  }

  const result = extractJsonObject<Record<string, unknown>>(content);
  const fallbackTitle = buildFallbackTitle(input.fileName);
  const fallbackDescription =
    "This ready-to-edit teacher resource includes classroom pages pulled from the uploaded file, clear student work, and teacher-facing support.";
  const candidateTitleOptions = Array.isArray(result.titleOptions)
    ? result.titleOptions
    : [];
  const primaryGeneratedTitle =
    typeof candidateTitleOptions[0] === "string" && candidateTitleOptions[0].trim()
      ? candidateTitleOptions[0].trim()
      : fallbackTitle;
  const standards = await mapStandardsWithGemini({
    title: primaryGeneratedTitle,
    excerpt: `${input.extractedText} ${result.shortDescription ? String(result.shortDescription) : ""}`.trim(),
    upload: {
      fileName: input.fileName,
      mimeType: "application/pdf",
      sizeBytes: input.extractedText.length,
      textContent: input.extractedText,
    },
  });

  return {
    titleOptions: normalizeTitleOptions(result.titleOptions, fallbackTitle),
    shortDescription:
      (typeof result.shortDescription === "string" && result.shortDescription.trim()) ||
      "A classroom-ready printable resource built from the uploaded file.",
    fullDescriptionOptions: normalizeDescriptionOptions(result.fullDescriptionOptions, fallbackDescription),
    tags: normalizeTagList(result.tags),
    subject: normalizeSubject(result.subject),
    gradeBand: normalizeGradeBand(result.gradeBand),
    standardsTag: standards.status === "success" ? standards.suggestedStandard : "",
    standardsConfidence: standards.status === "success" ? standards.confidence : "",
    standardsRationale: standards.status === "success" ? standards.rationale : "",
  } satisfies GeneratedListingSuggestion;
}

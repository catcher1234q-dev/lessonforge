import type { AIProviderResult } from "@/types";

type ProviderId = "gemini" | "openai";

type MappingInput = {
  title?: string;
  excerpt: string;
};

type ListingAssistInput = {
  title?: string;
  excerpt?: string;
  fileNames?: string[];
  subject?: string;
  gradeBand?: string;
};

export type ListingAssistResult = {
  provider: ProviderId;
  status: "success";
  message: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  gradeBand: string;
  tags: string[];
};

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const AI_TIMEOUT_MS = Number(process.env.AI_DEFAULT_TIMEOUT_MS || "30000");
const AI_MAX_INPUT_CHARACTERS = Number(process.env.AI_MAX_INPUT_CHARACTERS || "12000");

const patterns = [
  {
    keywords: ["decimal", "hundredths", "addition", "subtraction"],
    subject: "Math",
    standard: "CCSS.MATH.CONTENT.5.NBT.B.7",
    rationale:
      "The resource centers on operating with decimals to the hundredths place using models or written strategies.",
    confidence: "92%",
  },
  {
    keywords: ["fraction", "equivalent", "number line", "parts"],
    subject: "Math",
    standard: "CCSS.MATH.CONTENT.4.NF.A.1",
    rationale:
      "The language points to equivalent fractions and visual fraction reasoning, which align with Grade 4 fraction foundations.",
    confidence: "89%",
  },
  {
    keywords: ["theme", "story", "details", "character"],
    subject: "ELA",
    standard: "CCSS.ELA-LITERACY.RL.4.2",
    rationale:
      "The task asks students to determine a theme from literature and support it using text details.",
    confidence: "90%",
  },
  {
    keywords: ["inference", "evidence", "text", "passage"],
    subject: "ELA",
    standard: "CCSS.ELA-LITERACY.RL.4.1",
    rationale:
      "The excerpt emphasizes making inferences and citing evidence from text, which fits close reading standards.",
    confidence: "87%",
  },
  {
    keywords: ["ecosystem", "organisms", "pond", "habitat"],
    subject: "Science",
    standard: "MS-LS2-4",
    rationale:
      "The content describes interactions inside an ecosystem and asks students to explain changes using evidence.",
    confidence: "91%",
  },
  {
    keywords: ["civics", "government", "debate", "citizens"],
    subject: "Social Studies",
    standard: "D2.Civ.4.3-5",
    rationale:
      "The activity focuses on civic discussion, roles, and responsibilities in community decision-making.",
    confidence: "84%",
  },
];

function limitText(value: string) {
  return value.trim().slice(0, AI_MAX_INPUT_CHARACTERS);
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject<T>(value: string): T {
  const cleaned = stripCodeFence(value);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI is unavailable right now.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function normalizeTagList(tags: unknown) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

function sanitizeGradeBand(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (["K-12", "K-5", "6-8", "9-12"].includes(normalized)) {
    return normalized;
  }

  return "K-12";
}

function sanitizeSubject(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (["Math", "ELA", "Science", "Social Studies"].includes(normalized)) {
    return normalized;
  }

  return "Math";
}

function inferStandards({
  title = "",
  excerpt,
}: MappingInput): Omit<AIProviderResult, "provider" | "status" | "message"> {
  const haystack = `${title} ${excerpt}`.toLowerCase();

  const match = patterns.find((pattern) =>
    pattern.keywords.some((keyword) => haystack.includes(keyword)),
  );

  if (match) {
    return {
      subject: match.subject,
      suggestedStandard: match.standard,
      rationale: match.rationale,
      confidence: match.confidence,
    };
  }

  return {
    subject: "ELA",
    suggestedStandard: "CCSS.ELA-LITERACY.RI.5.1",
    rationale:
      "The excerpt reads like an informational reading task, so the fallback points to a general evidence-based comprehension standard.",
    confidence: "72%",
  };
}

function humanizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferSubjectFromText(text: string) {
  const haystack = text.toLowerCase();

  if (/(fraction|decimal|equation|algebra|geometry|number|math)/.test(haystack)) {
    return "Math";
  }

  if (/(theme|reading|passage|writing|ela|phonics|literacy|story)/.test(haystack)) {
    return "ELA";
  }

  if (/(ecosystem|science|lab|experiment|habitat|matter|energy)/.test(haystack)) {
    return "Science";
  }

  if (/(civics|government|history|geography|social studies|citizens)/.test(haystack)) {
    return "Social Studies";
  }

  return "Math";
}

function inferGradeBandFromText(text: string) {
  const haystack = text.toLowerCase();
  const gradeMatch = haystack.match(/\b([kK]|[1-9]|1[0-2])(?:st|nd|rd|th)?\s*grade\b/);

  if (gradeMatch?.[1]) {
    if (gradeMatch[1].toLowerCase() === "k") {
      return "K-5";
    }

    const numericGrade = Number(gradeMatch[1]);

    if (numericGrade <= 5) {
      return "K-5";
    }

    if (numericGrade <= 8) {
      return "6-8";
    }

    return "9-12";
  }

  if (/(kindergarten|elementary|upper elementary|primary)/.test(haystack)) {
    return "K-5";
  }

  if (/(middle school|grade 6|grade 7|grade 8)/.test(haystack)) {
    return "6-8";
  }

  if (/(high school|grade 9|grade 10|grade 11|grade 12)/.test(haystack)) {
    return "9-12";
  }

  return "K-12";
}

function buildFallbackListingAssistResult(
  provider: ProviderId,
  input: ListingAssistInput,
): ListingAssistResult {
  const sourceTitle =
    input.title?.trim() ||
    humanizeFileName(input.fileNames?.[0] || "") ||
    "Classroom resource";
  const textSample = `${sourceTitle} ${input.excerpt || ""} ${input.fileNames?.join(" ") || ""}`.trim();
  const subject = input.subject?.trim() || inferSubjectFromText(textSample);
  const gradeBand =
    input.gradeBand?.trim() && input.gradeBand !== "K-12"
      ? input.gradeBand
      : inferGradeBandFromText(textSample);
  const polishedTitle = titleCase(
    sourceTitle
      .replace(/\bpdf\b/gi, "")
      .replace(/\bpptx?\b/gi, "")
      .replace(/\bdocx?\b/gi, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const shortDescription = `${gradeBand} ${subject.toLowerCase()} resource that helps teachers open, teach, and reuse this lesson faster.`;
  const fullDescription = `This ${subject.toLowerCase()} resource is designed for ${gradeBand} classrooms and gives teachers a ready-to-use lesson they can review quickly, teach with confidence, and adapt for daily instruction.`;
  const tags = [
    subject,
    gradeBand,
    "classroom ready",
    "teacher resource",
    polishedTitle.split(" ").slice(0, 2).join(" ").toLowerCase(),
  ]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index);

  return {
    provider,
    status: "success",
    message:
      provider === "openai"
        ? "Generated with OpenAI."
        : "Generated with Gemini.",
    title: polishedTitle,
    shortDescription,
    fullDescription,
    subject,
    gradeBand,
    tags,
  };
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function assertServerKey(provider: ProviderId) {
  if (typeof window !== "undefined") {
    return "";
  }

  const key =
    provider === "openai"
      ? process.env.OPENAI_API_KEY || ""
      : getGeminiApiKey();

  if (!key) {
    throw new Error("AI is unavailable right now.");
  }

  return key;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AI_TIMEOUT_MS,
) {
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

function cleanProviderError(provider: ProviderId, error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    /aborted|timeout|timed out/i.test(message)
  ) {
    return new Error("AI is unavailable right now.");
  }

  if (/api key|unauthorized|forbidden|authentication|permission/i.test(message)) {
    return new Error("AI is unavailable right now.");
  }

  if (/rate limit|quota|resource exhausted|429/i.test(message)) {
    return new Error(
      provider === "openai"
        ? "OpenAI is unavailable right now."
        : "Gemini is unavailable right now.",
    );
  }

  return new Error(
    provider === "openai"
      ? "OpenAI is unavailable right now."
      : "Gemini is unavailable right now.",
  );
}

async function callOpenAIJson<T>(prompt: string): Promise<T> {
  const apiKey = assertServerKey("openai");
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON. Do not include markdown, explanations, or code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "OpenAI request failed.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI did not return usable content.");
  }

  return extractJsonObject<T>(content);
}

async function callGeminiJson<T>(prompt: string): Promise<T> {
  const apiKey = assertServerKey("gemini");
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
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Gemini request failed.");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");

  if (!content) {
    throw new Error("Gemini did not return usable content.");
  }

  return extractJsonObject<T>(content);
}

async function callProviderJson<T>(provider: ProviderId, prompt: string): Promise<T> {
  if (provider === "openai") {
    try {
      return await callOpenAIJson<T>(prompt);
    } catch (error) {
      throw cleanProviderError(provider, error);
    }
  }

  try {
    return await callGeminiJson<T>(prompt);
  } catch (error) {
    throw cleanProviderError(provider, error);
  }
}

function buildStandardsPrompt(input: MappingInput) {
  return [
    "You are classifying a K-12 teaching resource.",
    "Return JSON only with these string fields:",
    "subject, suggestedStandard, rationale, confidence",
    'subject must be one of: "Math", "ELA", "Science", "Social Studies".',
    "confidence should look like a percentage, for example 88%.",
    `Title: ${limitText(input.title || "Untitled resource")}`,
    `Excerpt: ${limitText(input.excerpt)}`,
  ].join("\n");
}

function buildListingAssistPrompt(input: ListingAssistInput) {
  return [
    "You are helping a teacher create a marketplace listing from an uploaded resource.",
    "Return JSON only with these fields:",
    "title, shortDescription, fullDescription, subject, gradeBand, tags",
    'subject must be one of: "Math", "ELA", "Science", "Social Studies".',
    'gradeBand must be one of: "K-12", "K-5", "6-8", "9-12".',
    "tags must be an array of 3 to 6 short strings.",
    "Keep descriptions clear and practical for teachers.",
    `Existing title: ${limitText(input.title || "Untitled resource")}`,
    `Excerpt: ${limitText(input.excerpt || "")}`,
    `Uploaded files: ${limitText((input.fileNames || []).join(", "))}`,
    `Current subject: ${limitText(input.subject || "")}`,
    `Current grade band: ${limitText(input.gradeBand || "")}`,
  ].join("\n");
}

function normalizeStandardsResult(
  provider: ProviderId,
  value: unknown,
  fallback: Omit<AIProviderResult, "provider" | "status" | "message">,
): AIProviderResult {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

  return {
    provider,
    status: "success",
    message:
      provider === "openai"
        ? "OpenAI standards mapping completed."
        : "Gemini standards mapping completed.",
    subject: sanitizeSubject(record.subject ?? fallback.subject),
    suggestedStandard:
      (typeof record.suggestedStandard === "string" && record.suggestedStandard.trim()) ||
      fallback.suggestedStandard,
    rationale:
      (typeof record.rationale === "string" && record.rationale.trim()) ||
      fallback.rationale,
    confidence:
      (typeof record.confidence === "string" && record.confidence.trim()) ||
      fallback.confidence,
  };
}

function normalizeListingAssistResult(
  provider: ProviderId,
  value: unknown,
  fallback: ListingAssistResult,
): ListingAssistResult {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

  return {
    provider,
    status: "success",
    message:
      provider === "openai"
        ? "Generated with OpenAI."
        : "Generated with Gemini.",
    title:
      (typeof record.title === "string" && record.title.trim()) || fallback.title,
    shortDescription:
      (typeof record.shortDescription === "string" && record.shortDescription.trim()) ||
      fallback.shortDescription,
    fullDescription:
      (typeof record.fullDescription === "string" && record.fullDescription.trim()) ||
      fallback.fullDescription,
    subject: sanitizeSubject(record.subject ?? fallback.subject),
    gradeBand: sanitizeGradeBand(record.gradeBand ?? fallback.gradeBand),
    tags: normalizeTagList(record.tags).length > 0 ? normalizeTagList(record.tags) : fallback.tags,
  };
}

export async function mapStandardsWithOpenAI({
  title,
  excerpt,
}: MappingInput): Promise<AIProviderResult> {
  const fallback = inferStandards({ title, excerpt });

  if (typeof window !== "undefined") {
    return {
      provider: "openai",
      status: "success",
      message: "OpenAI demo mapping completed.",
      ...fallback,
    };
  }

  const result = await callProviderJson<Record<string, unknown>>(
    "openai",
    buildStandardsPrompt({ title, excerpt }),
  );

  return normalizeStandardsResult("openai", result, fallback);
}

export async function mapStandardsWithGemini({
  title,
  excerpt,
}: MappingInput): Promise<AIProviderResult> {
  const fallback = inferStandards({ title, excerpt });

  if (typeof window !== "undefined") {
    return {
      provider: "gemini",
      status: "success",
      message: "Gemini demo mapping completed.",
      ...fallback,
    };
  }

  const result = await callProviderJson<Record<string, unknown>>(
    "gemini",
    buildStandardsPrompt({ title, excerpt }),
  );

  return normalizeStandardsResult("gemini", result, fallback);
}

export async function suggestListingWithOpenAI(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  const fallback = buildFallbackListingAssistResult("openai", input);

  if (typeof window !== "undefined") {
    return fallback;
  }

  const result = await callProviderJson<Record<string, unknown>>(
    "openai",
    buildListingAssistPrompt(input),
  );

  return normalizeListingAssistResult("openai", result, fallback);
}

export async function suggestListingWithGemini(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  const fallback = buildFallbackListingAssistResult("gemini", input);

  if (typeof window !== "undefined") {
    return fallback;
  }

  const result = await callProviderJson<Record<string, unknown>>(
    "gemini",
    buildListingAssistPrompt(input),
  );

  return normalizeListingAssistResult("gemini", result, fallback);
}

import type { AIProviderResult } from "@/types";

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
  provider: "gemini" | "openai";
  status: "success";
  message: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  gradeBand: string;
  tags: string[];
};

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

function inferStandards({ title = "", excerpt }: MappingInput): Omit<AIProviderResult, "provider" | "status" | "message"> {
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
    subject: "General Literacy",
    suggestedStandard: "CCSS.ELA-LITERACY.RI.5.1",
    rationale:
      "The excerpt reads like an informational reading task, so the demo falls back to a general evidence-based comprehension standard.",
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

function buildListingAssistResult(
  provider: "gemini" | "openai",
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

export async function mapStandardsWithOpenAI({
  title,
  excerpt,
}: MappingInput): Promise<AIProviderResult> {
  const inferred = inferStandards({ title, excerpt });

  return {
    provider: "openai",
    status: "success",
    message: "OpenAI demo mapping completed.",
    ...inferred,
  };
}

export async function mapStandardsWithGemini({
  title,
  excerpt,
}: MappingInput): Promise<AIProviderResult> {
  const inferred = inferStandards({ title, excerpt });

  return {
    provider: "gemini",
    status: "success",
    message: "Gemini demo mapping completed.",
    ...inferred,
  };
}

export async function suggestListingWithOpenAI(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  return buildListingAssistResult("openai", input);
}

export async function suggestListingWithGemini(
  input: ListingAssistInput,
): Promise<ListingAssistResult> {
  return buildListingAssistResult("gemini", input);
}

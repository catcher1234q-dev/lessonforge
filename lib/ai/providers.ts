import type { AIProviderResult } from "@/types";

type MappingInput = {
  title?: string;
  excerpt: string;
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

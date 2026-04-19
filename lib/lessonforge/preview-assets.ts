export type ManagedPreviewAsset = {
  id: string;
  label: string;
  formatLabel: string;
  previewUrl: string;
  cacheKey: string;
  pageCount: number;
  pageRangeLabel: string;
  watermarkLines: string[];
  exposurePolicy: string;
  deliveryMode: "cached-preview";
  originalDelivery: "protected-download";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferPreviewPageCount(format: string) {
  const lower = format.toLowerCase();

  if (lower.includes("slide")) {
    return 3;
  }

  if (lower.includes("bundle") || lower.includes("toolkit")) {
    return 4;
  }

  return 3;
}

export function inferProductAssetType(format: string) {
  const lower = format.toLowerCase();

  if (lower.includes("slide")) {
    return "PPTX" as const;
  }

  if (lower.includes("image")) {
    return "IMAGE" as const;
  }

  if (lower.includes("zip") || lower.includes("bundle")) {
    return "ZIP" as const;
  }

  if (lower.includes("sheet") || lower.includes("xls")) {
    return "XLSX" as const;
  }

  if (lower.includes("doc")) {
    return "DOCX" as const;
  }

  return "PDF" as const;
}

export function buildStoredAssetPaths(input: {
  productId: string;
  title: string;
  format: string;
}) {
  const pageCount = inferPreviewPageCount(input.format);
  const baseSlug = slugify(input.title);

  return {
    originalUrl: "/api/lessonforge/library-delivery",
    thumbnailUrl: `/api/lessonforge/thumbnail-assets/${baseSlug}`,
    previewUrls: Array.from({ length: pageCount }, (_, index) =>
      `/api/lessonforge/preview-assets/${baseSlug}?page=${index + 1}`,
    ),
    assetVersionNumber: 1,
  };
}

export function buildManagedPreviewAssets(input: {
  productId: string;
  title: string;
  subject: string;
  format: string;
  previewLabels?: string[];
  previewUrls?: string[];
}) {
  const pageCount = inferPreviewPageCount(input.format);
  const previewCount = Math.min(input.previewUrls?.length ?? pageCount, 5);
  const baseSlug = slugify(input.title);
  const labels =
    input.previewLabels ??
    Array.from({ length: previewCount }, (_, index) => `Preview page ${index + 1}`);

  return labels.slice(0, 5).map((label, index) => ({
    id: `${input.productId}-preview-${index + 1}`,
    label,
    formatLabel: input.format,
    previewUrl:
      input.previewUrls?.[index] ??
      `/api/lessonforge/preview-assets/${baseSlug}?page=${index + 1}`,
    cacheKey: `preview:${input.productId}:v1:page-${index + 1}`,
    pageCount: previewCount,
    pageRangeLabel: `Preview page ${index + 1} of ${previewCount}`,
    watermarkLines: ["LessonForge Preview", "Sample Only"],
    exposurePolicy: `Only the first ${pageCount} preview pages are exposed before purchase.`,
    deliveryMode: "cached-preview" as const,
    originalDelivery: "protected-download" as const,
  }));
}

export function renderMissingPreviewSvg(input: {
  title: string;
  message?: string;
}) {
  const safeTitle = escapeXml(input.title || "Preview not ready yet");
  const safeMessage = escapeXml(
    input.message || "We are still preparing your sample pages.",
  );

  return `
    <svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" rx="48" fill="#F8FAFC"/>
      <rect x="70" y="70" width="1060" height="1460" rx="40" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
      <rect x="120" y="132" width="240" height="54" rx="27" fill="#FEE2E2"/>
      <text x="160" y="168" fill="#B91C1C" font-size="24" font-family="Arial, sans-serif" font-weight="700">Preview not ready yet</text>
      <text x="120" y="260" fill="#0F172A" font-size="66" font-family="Arial, sans-serif" font-weight="800">${safeTitle}</text>
      <text x="120" y="336" fill="#475569" font-size="34" font-family="Arial, sans-serif">${safeMessage}</text>
      <rect x="120" y="420" width="960" height="420" rx="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="4" stroke-dasharray="16 16"/>
      <text x="360" y="626" fill="#64748B" font-size="42" font-family="Arial, sans-serif" font-weight="700">Authentic preview pages loading</text>
      <text x="252" y="682" fill="#94A3B8" font-size="28" font-family="Arial, sans-serif">Readable lesson pages will appear here after upload processing.</text>
      <rect x="120" y="902" width="448" height="220" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="4"/>
      <rect x="612" y="902" width="468" height="220" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="4"/>
      <text x="154" y="980" fill="#0F172A" font-size="28" font-family="Arial, sans-serif" font-weight="700">Try again</text>
      <text x="154" y="1036" fill="#64748B" font-size="24" font-family="Arial, sans-serif">Open preview again after the upload finishes processing.</text>
      <text x="648" y="980" fill="#0F172A" font-size="28" font-family="Arial, sans-serif" font-weight="700">Real files stay protected</text>
      <text x="648" y="1036" fill="#64748B" font-size="24" font-family="Arial, sans-serif">This fallback avoids broken asset errors while previews are missing.</text>
      <text x="764" y="1490" fill="#CBD5E1" font-size="54" font-family="Arial, sans-serif" font-weight="800" transform="rotate(-24 764 1490)">LESSONFORGE PREVIEW</text>
    </svg>
  `;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getSubjectArtDirection(subject: string) {
  switch (subject) {
    case "Math":
      return {
        primary: "#2563eb",
        secondary: "#93c5fd",
        tertiary: "#eff6ff",
        ink: "#1e3a8a",
        badge: "#dbeafe",
      };
    case "ELA":
      return {
        primary: "#e11d48",
        secondary: "#fda4af",
        tertiary: "#fff1f2",
        ink: "#9f1239",
        badge: "#ffe4e6",
      };
    case "Science":
      return {
        primary: "#059669",
        secondary: "#6ee7b7",
        tertiary: "#ecfdf5",
        ink: "#065f46",
        badge: "#d1fae5",
      };
    default:
      return {
        primary: "#d97706",
        secondary: "#fcd34d",
        tertiary: "#fffbeb",
        ink: "#92400e",
        badge: "#fef3c7",
      };
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickVariant(value: string, count: number) {
  return hashString(value) % count;
}

function getProductFamily(input: { title?: string; format?: string; subject: string }) {
  const source = `${input.title ?? ""} ${input.format ?? ""}`.toLowerCase();

  if (input.subject === "Math") {
    if (source.includes("intervention")) {
      return "intervention";
    }
    if (source.includes("fluency")) {
      return "fluency";
    }
    return "practice";
  }

  if (input.subject === "ELA") {
    if (source.includes("poetry")) {
      return "poetry";
    }
    if (source.includes("writing")) {
      return "writing";
    }
    return "reading";
  }

  if (input.subject === "Science") {
    if (source.includes("weather")) {
      return "weather";
    }
    if (source.includes("lab")) {
      return "lab";
    }
    return "inquiry";
  }

  if (source.includes("source")) {
    return "source";
  }
  if (source.includes("community") || source.includes("civics")) {
    return "civics";
  }
  return "inquiry";
}

function getPreviewPageContent(input: {
  subject: string;
  family: string;
  pageNumber: number;
  pageCount: number;
  format?: string;
}) {
  const coverLabel = input.pageNumber === 1 ? "Cover preview" : `Preview page ${input.pageNumber}`;

  if (input.subject === "Math") {
    if (input.pageNumber === 1) {
      return {
        pageLabel: coverLabel,
        mainTitle: "Small-group lesson sequence",
        subtitle: "Warm-up, model, guided practice, and a quick independent check",
        taskTitle: "What teachers can see",
        taskLines: [
          "Strong cover with grade, standard, and resource purpose",
          "Preview pages show actual student problems and models",
          "Answer support appears on the final preview page",
        ],
        infoChips: ["Visual models", "Answer key"],
        callout: "Ready for centers, reteach, or exit tickets",
      };
    }

    if (input.pageNumber === input.pageCount) {
      return {
        pageLabel: "Teacher notes",
        mainTitle: "Answer key and support notes",
        subtitle: "Clear worked examples and a quick reteach script",
        taskTitle: "Teacher support",
        taskLines: [
          "1. Model the strategy with a visual representation.",
          "2. Listen for precise math language during partner talk.",
          "3. Use the quick check to decide who needs reteach.",
        ],
        infoChips: ["Worked examples", "Reteach cue"],
        callout: "Teacher-facing page stays readable in preview",
      };
    }

    return {
      pageLabel: "Student practice",
      mainTitle: "Solve, explain, and compare",
      subtitle: "Students work through real questions instead of decorative filler.",
      taskTitle: "Sample tasks",
      taskLines: [
        "A. Shade the model to represent 3/4.",
        "B. Compare 2/3 and 3/4 using >, <, or =.",
        "C. Explain your strategy in one complete sentence.",
      ],
      infoChips: ["Recording space", "Math talk prompt"],
      callout: "Readable student page with actual practice",
    };
  }

  if (input.subject === "ELA") {
    if (input.pageNumber === 1) {
      return {
        pageLabel: coverLabel,
        mainTitle: "Reading and response sequence",
        subtitle: "Mini lesson, text evidence prompt, and a written response page",
        taskTitle: "What buyers notice",
        taskLines: [
          "Authentic reading task with visible classroom language",
          "Response organizer shows real student writing space",
          "Teacher notes preview the discussion structure",
        ],
        infoChips: ["Text evidence", "Writing support"],
        callout: "Built for reading workshop and small groups",
      };
    }

    if (input.pageNumber === input.pageCount) {
      return {
        pageLabel: "Teacher notes",
        mainTitle: "Discussion prompts and answer support",
        subtitle: "Sentence stems, coaching notes, and sample responses",
        taskTitle: "Conference support",
        taskLines: [
          "Prompt students to cite one detail before sharing a claim.",
          "Use the revision checklist during partner feedback.",
          "Sample response helps teachers calibrate expectations.",
        ],
        infoChips: ["Conference cues", "Sample response"],
        callout: "Teacher-facing support without giving away the full file",
      };
    }

    return {
      pageLabel: "Student preview",
      mainTitle: "Read, annotate, and respond",
      subtitle: "Preview includes real prompts teachers would expect to buy.",
      taskTitle: "Sample tasks",
      taskLines: [
        "1. Read the short passage closely.",
        "2. Underline one clue that supports your thinking.",
        "3. Write a response using evidence from the text.",
      ],
      infoChips: ["Annotation space", "Response frame"],
      callout: "Authentic inside page with readable literacy tasks",
    };
  }

  if (input.subject === "Science") {
    if (input.pageNumber === 1) {
      return {
        pageLabel: coverLabel,
        mainTitle: "Inquiry launch and lab sequence",
        subtitle: "Observation, evidence gathering, and a written explanation page",
        taskTitle: "What buyers see",
        taskLines: [
          "Cover and preview pages show the lesson flow clearly.",
          "Students record real observations and data points.",
          "Teacher page includes CER support and facilitation notes.",
        ],
        infoChips: ["Observation page", "CER support"],
        callout: "Designed for classroom labs and notebook work",
      };
    }

    if (input.pageNumber === input.pageCount) {
      return {
        pageLabel: "Teacher notes",
        mainTitle: "CER support and debrief notes",
        subtitle: "A quick teacher page with expected evidence and discussion cues",
        taskTitle: "Teacher support",
        taskLines: [
          "Ask students to point to one observation before making a claim.",
          "Use the evidence bank to scaffold precise vocabulary.",
          "Close with a short reflection and partner share.",
        ],
        infoChips: ["Debrief prompt", "Evidence bank"],
        callout: "Clear teacher-facing support for science instruction",
      };
    }

    return {
      pageLabel: "Student preview",
      mainTitle: "Observe, record, and explain",
      subtitle: "Students interact with data and turn it into a written explanation.",
      taskTitle: "Sample tasks",
      taskLines: [
        "A. Record two observations from the model or data table.",
        "B. Circle one pattern you notice.",
        "C. Write a claim and support it with evidence.",
      ],
      infoChips: ["Data table", "Reflection prompt"],
      callout: "Authentic student page with classroom-ready science work",
    };
  }

  if (input.pageNumber === 1) {
    return {
      pageLabel: coverLabel,
      mainTitle: "Social studies resource sequence",
      subtitle: "Source analysis, discussion support, and a written reflection page",
      taskTitle: "What buyers see",
      taskLines: [
        "A strong cover and clearly labeled preview pages.",
        "Real questions instead of empty decorative blocks.",
        "Teacher notes show how the lesson is used in class.",
      ],
      infoChips: ["Primary source", "Discussion prompts"],
      callout: "Built for discussion, source work, and reflection",
    };
  }

  if (input.pageNumber === input.pageCount) {
    return {
      pageLabel: "Teacher notes",
      mainTitle: "Discussion notes and extension ideas",
      subtitle: "Sample facilitation support with a short extension option",
      taskTitle: "Teacher support",
      taskLines: [
        "Invite students to notice one detail before naming a claim.",
        "Use the sentence stems for accountable talk.",
        "Wrap up with one written reflection or exit slip.",
      ],
      infoChips: ["Talk stems", "Extension"],
      callout: "Teacher-facing notes remain visible and trustworthy",
    };
  }

  return {
    pageLabel: "Student preview",
    mainTitle: "Look, think, and explain",
    subtitle: "Preview pages show real classroom-style prompts and response space.",
    taskTitle: "Sample tasks",
    taskLines: [
      "1. Study the image, text, or source closely.",
      "2. Record one piece of evidence.",
      "3. Explain your thinking in a complete sentence.",
    ],
    infoChips: ["Response space", "Reflection prompt"],
    callout: "Readable social studies preview instead of a mock layout",
  };
}

function renderSubjectThumbnailMotif(subject: string, seed: string, family: string) {
  const variant = pickVariant(`${subject}:${seed}:thumb`, 3);

  switch (subject) {
    case "Math":
      if (family === "intervention") {
        return `
          <rect x="634" y="404" width="188" height="214" rx="24" fill="#dbeafe" />
          <rect x="848" y="404" width="174" height="96" rx="18" fill="#dbeafe" />
          <rect x="848" y="524" width="174" height="96" rx="18" fill="#dbeafe" />
          <text x="664" y="470" fill="#1e3a8a" font-size="22" font-family="Arial, sans-serif" font-weight="800">small group</text>
          <text x="664" y="518" fill="#1e3a8a" font-size="38" font-family="Arial, sans-serif" font-weight="800">fraction fix</text>
          <text x="880" y="462" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">reteach page</text>
          <text x="880" y="582" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">exit slip</text>
        `;
      }

      if (family === "fluency") {
        return `
          <circle cx="700" cy="466" r="62" fill="#dbeafe" />
          <circle cx="914" cy="534" r="52" fill="#dbeafe" />
          <rect x="648" y="610" width="352" height="18" rx="9" fill="#bfdbfe" />
          <text x="656" y="476" fill="#1e3a8a" font-size="24" font-family="Arial, sans-serif" font-weight="800">2 + 7 = 9</text>
          <text x="866" y="542" fill="#1e3a8a" font-size="24" font-family="Arial, sans-serif" font-weight="800">8 × 4</text>
        `;
      }

      if (variant === 0) {
        return `
          <circle cx="690" cy="452" r="54" fill="#dbeafe" />
          <circle cx="906" cy="518" r="54" fill="#dbeafe" />
          <rect x="652" y="610" width="318" height="18" rx="9" fill="#bfdbfe" />
          <text x="660" y="460" fill="#1e3a8a" font-size="30" font-family="Arial, sans-serif" font-weight="800">3 × 4 = 12</text>
          <text x="882" y="526" fill="#1e3a8a" font-size="28" font-family="Arial, sans-serif" font-weight="800">5/8</text>
        `;
      }

      if (variant === 1) {
        return `
          <rect x="632" y="404" width="190" height="214" rx="24" fill="#dbeafe" />
          <rect x="850" y="404" width="176" height="92" rx="18" fill="#dbeafe" />
          <rect x="850" y="520" width="176" height="92" rx="18" fill="#dbeafe" />
          <text x="670" y="476" fill="#1e3a8a" font-size="26" font-family="Arial, sans-serif" font-weight="800">Area model</text>
          <text x="670" y="520" fill="#1e3a8a" font-size="42" font-family="Arial, sans-serif" font-weight="800">24 ÷ 6</text>
          <text x="886" y="456" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">Fractions</text>
          <text x="886" y="478" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">strips</text>
          <text x="886" y="572" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">Number</text>
          <text x="886" y="594" fill="#1e3a8a" font-size="18" font-family="Arial, sans-serif" font-weight="800">talk</text>
        `;
      }

      return `
        <circle cx="710" cy="466" r="64" fill="#dbeafe" />
        <rect x="804" y="420" width="214" height="184" rx="22" fill="#dbeafe" />
        <rect x="646" y="614" width="372" height="18" rx="9" fill="#bfdbfe" />
        <text x="666" y="478" fill="#1e3a8a" font-size="28" font-family="Arial, sans-serif" font-weight="800">Place value</text>
        <text x="846" y="486" fill="#1e3a8a" font-size="28" font-family="Arial, sans-serif" font-weight="800">1.25 + 0.4</text>
        <text x="846" y="540" fill="#1e3a8a" font-size="20" font-family="Arial, sans-serif" font-weight="800">visual model</text>
      `;
    case "ELA":
      if (family === "poetry") {
        return `
          <rect x="632" y="406" width="186" height="214" rx="24" fill="#fff1f2" />
          <rect x="842" y="406" width="182" height="96" rx="18" fill="#ffe4e6" />
          <rect x="842" y="526" width="182" height="96" rx="18" fill="#ffe4e6" />
          <text x="662" y="470" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="800">poetry</text>
          <text x="662" y="510" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="800">response</text>
          <text x="872" y="466" fill="#9f1239" font-size="18" font-family="Arial, sans-serif" font-weight="800">mentor text</text>
          <text x="872" y="586" fill="#9f1239" font-size="18" font-family="Arial, sans-serif" font-weight="800">annotate + write</text>
        `;
      }

      if (family === "writing") {
        return `
          <rect x="638" y="414" width="366" height="186" rx="24" fill="#fff1f2" />
          <rect x="668" y="452" width="292" height="18" rx="9" fill="#fecdd3" />
          <rect x="668" y="488" width="248" height="18" rx="9" fill="#fecdd3" />
          <rect x="668" y="524" width="274" height="18" rx="9" fill="#fecdd3" />
          <text x="668" y="584" fill="#9f1239" font-size="22" font-family="Arial, sans-serif" font-weight="700">paragraph frame + checklist</text>
        `;
      }

      if (variant === 0) {
        return `
          <rect x="628" y="404" width="324" height="208" rx="24" fill="#fff1f2" />
          <rect x="660" y="446" width="260" height="20" rx="10" fill="#fecdd3" />
          <rect x="660" y="486" width="218" height="20" rx="10" fill="#fecdd3" />
          <rect x="660" y="526" width="244" height="20" rx="10" fill="#fecdd3" />
          <text x="660" y="590" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="700">Close reading + response</text>
        `;
      }

      if (variant === 1) {
        return `
          <rect x="628" y="404" width="174" height="216" rx="24" fill="#fff1f2" />
          <rect x="824" y="404" width="188" height="96" rx="18" fill="#ffe4e6" />
          <rect x="824" y="524" width="188" height="96" rx="18" fill="#ffe4e6" />
          <text x="654" y="468" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="800">Poetry</text>
          <text x="654" y="506" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="800">response</text>
          <text x="854" y="462" fill="#9f1239" font-size="20" font-family="Arial, sans-serif" font-weight="800">mentor text</text>
          <text x="854" y="582" fill="#9f1239" font-size="20" font-family="Arial, sans-serif" font-weight="800">writing stems</text>
        `;
      }

      return `
        <rect x="638" y="414" width="364" height="186" rx="24" fill="#fff1f2" />
        <rect x="666" y="452" width="304" height="18" rx="9" fill="#fecdd3" />
        <rect x="666" y="488" width="244" height="18" rx="9" fill="#fecdd3" />
        <rect x="666" y="524" width="278" height="18" rx="9" fill="#fecdd3" />
        <text x="666" y="584" fill="#9f1239" font-size="24" font-family="Arial, sans-serif" font-weight="700">Vocabulary + partner talk</text>
      `;
    case "Science":
      if (family === "weather") {
        return `
          <rect x="634" y="410" width="164" height="206" rx="24" fill="#d1fae5" />
          <circle cx="900" cy="454" r="44" fill="#a7f3d0" />
          <circle cx="966" cy="550" r="32" fill="#6ee7b7" />
          <text x="658" y="468" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">weather</text>
          <text x="658" y="506" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">data</text>
          <text x="856" y="462" fill="#065f46" font-size="18" font-family="Arial, sans-serif" font-weight="800">pattern chart</text>
        `;
      }

      if (family === "lab") {
        return `
          <circle cx="704" cy="484" r="62" fill="#d1fae5" />
          <rect x="792" y="414" width="216" height="196" rx="24" fill="#d1fae5" />
          <path d="M640 604 C718 540 806 540 884 604" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
          <text x="648" y="490" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">lab setup</text>
          <text x="828" y="474" fill="#065f46" font-size="18" font-family="Arial, sans-serif" font-weight="800">claim + evidence</text>
          <text x="828" y="520" fill="#065f46" font-size="18" font-family="Arial, sans-serif" font-weight="800">student notes</text>
        `;
      }

      if (variant === 0) {
        return `
          <circle cx="718" cy="490" r="72" fill="#d1fae5" />
          <circle cx="880" cy="454" r="44" fill="#a7f3d0" />
          <circle cx="940" cy="558" r="30" fill="#6ee7b7" />
          <path d="M700 584 C752 508 812 508 864 584" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
          <text x="672" y="500" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">OBSERVE</text>
        `;
      }

      if (variant === 1) {
        return `
          <rect x="634" y="410" width="164" height="206" rx="24" fill="#d1fae5" />
          <circle cx="900" cy="456" r="46" fill="#a7f3d0" />
          <circle cx="970" cy="558" r="36" fill="#6ee7b7" />
          <text x="658" y="468" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">Weather</text>
          <text x="658" y="506" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">patterns</text>
          <text x="862" y="464" fill="#065f46" font-size="18" font-family="Arial, sans-serif" font-weight="800">lab setup</text>
        `;
      }

      return `
        <circle cx="700" cy="484" r="62" fill="#d1fae5" />
        <rect x="790" y="414" width="216" height="196" rx="24" fill="#d1fae5" />
        <path d="M640 604 C718 540 806 540 884 604" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
        <text x="646" y="490" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">Experiment</text>
        <text x="828" y="474" fill="#065f46" font-size="20" font-family="Arial, sans-serif" font-weight="800">CER notes</text>
        <text x="828" y="520" fill="#065f46" font-size="20" font-family="Arial, sans-serif" font-weight="800">student lab page</text>
      `;
    default:
      if (family === "source") {
        return `
          <rect x="640" y="414" width="356" height="90" rx="18" fill="#fde68a" />
          <rect x="640" y="526" width="180" height="90" rx="18" fill="#fde68a" />
          <rect x="844" y="526" width="152" height="90" rx="18" fill="#fde68a" />
          <text x="674" y="470" fill="#92400e" font-size="22" font-family="Arial, sans-serif" font-weight="800">primary source set</text>
          <text x="670" y="582" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">evidence tracker</text>
          <text x="874" y="582" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">analysis notes</text>
        `;
      }

      if (family === "civics") {
        return `
          <rect x="650" y="420" width="176" height="196" rx="24" fill="#fef3c7" />
          <rect x="854" y="420" width="154" height="88" rx="18" fill="#fde68a" />
          <rect x="854" y="532" width="154" height="88" rx="18" fill="#fde68a" />
          <text x="682" y="472" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">community</text>
          <text x="682" y="512" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">helpers</text>
          <text x="878" y="474" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">sort cards</text>
          <text x="878" y="586" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">role match</text>
        `;
      }

      if (variant === 0) {
        return `
          <rect x="636" y="414" width="148" height="202" rx="22" fill="#fef3c7" />
          <rect x="812" y="414" width="190" height="90" rx="18" fill="#fde68a" />
          <rect x="812" y="526" width="190" height="90" rx="18" fill="#fde68a" />
          <path d="M676 456 L734 428 L762 470 L704 498 Z" fill="#d97706" opacity="0.55" />
          <text x="838" y="470" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">Map work</text>
          <text x="838" y="582" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">Primary source</text>
        `;
      }

      if (variant === 1) {
        return `
          <rect x="640" y="414" width="356" height="90" rx="18" fill="#fde68a" />
          <rect x="640" y="526" width="180" height="90" rx="18" fill="#fde68a" />
          <rect x="844" y="526" width="152" height="90" rx="18" fill="#fde68a" />
          <text x="676" y="470" fill="#92400e" font-size="22" font-family="Arial, sans-serif" font-weight="800">Civics and community</text>
          <text x="672" y="582" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">discussion cards</text>
          <text x="874" y="582" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">source sort</text>
        `;
      }

      return `
        <rect x="650" y="420" width="176" height="196" rx="24" fill="#fef3c7" />
        <rect x="854" y="420" width="154" height="88" rx="18" fill="#fde68a" />
        <rect x="854" y="532" width="154" height="88" rx="18" fill="#fde68a" />
        <text x="684" y="474" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">Geography</text>
        <text x="684" y="514" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">inquiry</text>
        <text x="880" y="474" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">map key</text>
        <text x="880" y="586" fill="#92400e" font-size="18" font-family="Arial, sans-serif" font-weight="800">compare regions</text>
      `;
  }
}

function renderSubjectPreviewMotif(subject: string, seed: string, family: string) {
  const variant = pickVariant(`${subject}:${seed}:preview`, 3);

  switch (subject) {
    case "Math":
      if (family === "intervention") {
        return `
          <rect x="548" y="516" width="212" height="168" rx="26" fill="#dbeafe" />
          <rect x="794" y="526" width="196" height="34" rx="17" fill="#dbeafe" />
          <rect x="794" y="584" width="188" height="34" rx="17" fill="#dbeafe" />
          <rect x="794" y="642" width="146" height="34" rx="17" fill="#dbeafe" />
          <text x="580" y="612" fill="#1e3a8a" font-size="22" font-family="Arial, sans-serif" font-weight="800">reteach model</text>
        `;
      }

      if (family === "fluency") {
        return `
          <circle cx="638" cy="594" r="72" fill="#dbeafe" />
          <rect x="794" y="526" width="176" height="40" rx="20" fill="#dbeafe" />
          <rect x="794" y="588" width="208" height="40" rx="20" fill="#dbeafe" />
          <text x="600" y="608" fill="#1e3a8a" font-size="40" font-family="Arial, sans-serif" font-weight="800">6 × 7</text>
        `;
      }

      if (variant === 0) {
        return `
          <rect x="552" y="518" width="170" height="170" rx="26" fill="#dbeafe" />
          <text x="596" y="608" fill="#1e3a8a" font-size="56" font-family="Arial, sans-serif" font-weight="800">÷</text>
          <rect x="796" y="534" width="198" height="32" rx="16" fill="#dbeafe" />
          <rect x="796" y="588" width="154" height="32" rx="16" fill="#dbeafe" />
        `;
      }

      if (variant === 1) {
        return `
          <circle cx="636" cy="602" r="74" fill="#dbeafe" />
          <rect x="796" y="522" width="184" height="40" rx="20" fill="#dbeafe" />
          <rect x="796" y="584" width="220" height="40" rx="20" fill="#dbeafe" />
          <text x="600" y="614" fill="#1e3a8a" font-size="44" font-family="Arial, sans-serif" font-weight="800">1/4</text>
        `;
      }

      return `
        <rect x="540" y="520" width="218" height="162" rx="26" fill="#dbeafe" />
        <rect x="796" y="526" width="180" height="32" rx="16" fill="#dbeafe" />
        <rect x="796" y="580" width="180" height="32" rx="16" fill="#dbeafe" />
        <rect x="796" y="634" width="132" height="32" rx="16" fill="#dbeafe" />
      `;
    case "ELA":
      if (family === "poetry") {
        return `
          <rect x="548" y="506" width="236" height="182" rx="26" fill="#ffe4e6" />
          <rect x="824" y="506" width="176" height="32" rx="16" fill="#ffe4e6" />
          <rect x="824" y="560" width="176" height="32" rx="16" fill="#ffe4e6" />
          <rect x="824" y="614" width="144" height="32" rx="16" fill="#ffe4e6" />
          <text x="580" y="610" fill="#9f1239" font-size="20" font-family="Arial, sans-serif" font-weight="800">annotate the poem</text>
        `;
      }

      if (family === "writing") {
        return `
          <rect x="540" y="512" width="468" height="72" rx="24" fill="#ffe4e6" />
          <rect x="540" y="608" width="312" height="72" rx="24" fill="#ffe4e6" />
          <rect x="876" y="608" width="132" height="72" rx="24" fill="#ffe4e6" />
          <text x="578" y="558" fill="#9f1239" font-size="20" font-family="Arial, sans-serif" font-weight="800">topic sentence + evidence</text>
        `;
      }

      if (variant === 0) {
        return `
          <rect x="548" y="506" width="236" height="182" rx="26" fill="#ffe4e6" />
          <rect x="824" y="506" width="176" height="32" rx="16" fill="#ffe4e6" />
          <rect x="824" y="560" width="176" height="32" rx="16" fill="#ffe4e6" />
          <rect x="824" y="614" width="144" height="32" rx="16" fill="#ffe4e6" />
        `;
      }

      if (variant === 1) {
        return `
          <rect x="548" y="512" width="172" height="176" rx="24" fill="#ffe4e6" />
          <rect x="748" y="512" width="268" height="44" rx="20" fill="#ffe4e6" />
          <rect x="748" y="578" width="220" height="44" rx="20" fill="#ffe4e6" />
          <rect x="748" y="644" width="188" height="44" rx="20" fill="#ffe4e6" />
        `;
      }

      return `
        <rect x="540" y="512" width="468" height="72" rx="24" fill="#ffe4e6" />
        <rect x="540" y="608" width="312" height="72" rx="24" fill="#ffe4e6" />
        <rect x="876" y="608" width="132" height="72" rx="24" fill="#ffe4e6" />
      `;
    case "Science":
      if (family === "weather") {
        return `
          <rect x="550" y="514" width="188" height="174" rx="26" fill="#d1fae5" />
          <circle cx="882" cy="550" r="52" fill="#a7f3d0" />
          <circle cx="966" cy="618" r="30" fill="#6ee7b7" />
          <text x="584" y="604" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">weather chart</text>
        `;
      }

      if (family === "lab") {
        return `
          <circle cx="628" cy="584" r="62" fill="#d1fae5" />
          <rect x="774" y="522" width="240" height="158" rx="24" fill="#d1fae5" />
          <path d="M584 650 C668 576 772 576 856 650" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
          <text x="812" y="604" fill="#065f46" font-size="20" font-family="Arial, sans-serif" font-weight="800">lab notebook</text>
        `;
      }

      if (variant === 0) {
        return `
          <circle cx="648" cy="592" r="74" fill="#d1fae5" />
          <circle cx="892" cy="540" r="42" fill="#a7f3d0" />
          <circle cx="942" cy="622" r="28" fill="#6ee7b7" />
          <path d="M612 656 C672 572 760 572 820 656" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
        `;
      }

      if (variant === 1) {
        return `
          <rect x="550" y="514" width="188" height="174" rx="26" fill="#d1fae5" />
          <circle cx="882" cy="550" r="52" fill="#a7f3d0" />
          <circle cx="966" cy="618" r="30" fill="#6ee7b7" />
          <text x="590" y="604" fill="#065f46" font-size="22" font-family="Arial, sans-serif" font-weight="800">data chart</text>
        `;
      }

      return `
        <circle cx="628" cy="584" r="62" fill="#d1fae5" />
        <rect x="774" y="522" width="240" height="158" rx="24" fill="#d1fae5" />
        <path d="M584 650 C668 576 772 576 856 650" fill="none" stroke="#065f46" stroke-width="12" stroke-linecap="round" />
      `;
    default:
      if (family === "source") {
        return `
          <rect x="548" y="516" width="420" height="70" rx="24" fill="#fef3c7" />
          <rect x="548" y="608" width="234" height="70" rx="24" fill="#fef3c7" />
          <rect x="806" y="608" width="162" height="70" rx="24" fill="#fef3c7" />
          <text x="588" y="560" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">source note catcher</text>
        `;
      }

      if (family === "civics") {
        return `
          <rect x="548" y="514" width="170" height="172" rx="24" fill="#fef3c7" />
          <rect x="754" y="514" width="262" height="74" rx="24" fill="#fef3c7" />
          <rect x="754" y="612" width="220" height="74" rx="24" fill="#fef3c7" />
          <text x="578" y="606" fill="#92400e" font-size="20" font-family="Arial, sans-serif" font-weight="800">community sort</text>
        `;
      }

      if (variant === 0) {
        return `
          <rect x="548" y="510" width="188" height="182" rx="24" fill="#fef3c7" />
          <rect x="790" y="512" width="226" height="56" rx="18" fill="#fde68a" />
          <rect x="790" y="590" width="226" height="56" rx="18" fill="#fde68a" />
        `;
      }

      if (variant === 1) {
        return `
          <rect x="548" y="516" width="420" height="70" rx="24" fill="#fef3c7" />
          <rect x="548" y="608" width="234" height="70" rx="24" fill="#fef3c7" />
          <rect x="806" y="608" width="162" height="70" rx="24" fill="#fef3c7" />
        `;
      }

      return `
        <rect x="548" y="514" width="170" height="172" rx="24" fill="#fef3c7" />
        <rect x="754" y="514" width="262" height="74" rx="24" fill="#fef3c7" />
        <rect x="754" y="612" width="220" height="74" rx="24" fill="#fef3c7" />
      `;
  }
}

function splitTextLines(value: string, maxLineLength: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const consumed = lines.join(" ").replace(/\s+/g, " ").trim();
  const original = words.join(" ");

  if (original.length > consumed.length && lines.length) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];
    lines[lastIndex] =
      lastLine.length > maxLineLength - 1
        ? `${lastLine.slice(0, Math.max(1, maxLineLength - 2)).trimEnd()}...`
        : `${lastLine}...`;
  }

  return lines;
}

function splitTitleLines(title: string, maxLineLength: number, maxLines = 3) {
  return splitTextLines(title, maxLineLength, maxLines);
}

function renderTextLines(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  options?: {
    fontWeight?: number;
    lineGap?: number;
    opacity?: number;
    letterSpacing?: number;
  },
) {
  const lineGap = options?.lineGap ?? 14;
  const opacity = options?.opacity === undefined ? "" : ` opacity="${options.opacity}"`;
  const letterSpacing =
    options?.letterSpacing === undefined ? "" : ` letter-spacing="${options.letterSpacing}"`;

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * (fontSize + lineGap)}" fill="${fill}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="${options?.fontWeight ?? 800}"${opacity}${letterSpacing}>${escapeXml(line)}</text>`,
    )
    .join("");
}

function getCoverCopy(input: {
  title: string;
  subject: string;
  gradeBand: string;
  format?: string;
}) {
  const variant = pickVariant(
    `${input.title}:${input.gradeBand}:${input.format ?? "preview"}:${input.subject}:copy`,
    4,
  );

  const bySubject = (() => {
    switch (input.subject) {
      case "Math":
        return [
          {
            badge: "Practice pack",
            subhead: "Mini lessons and quick checks",
            callout: "Classroom ready",
          },
          {
            badge: "Intervention",
            subhead: "Visual models and reteach pages",
            callout: "Built for small groups",
          },
          {
            badge: "Problem solving",
            subhead: "Worked examples and student tasks",
            callout: "Ready for centers",
          },
          {
            badge: "Fluency builder",
            subhead: "Warm-ups and printable practice",
            callout: "Easy to print",
          },
        ];
      case "ELA":
        return [
          {
            badge: "Reading workshop",
            subhead: "Mini lessons and response pages",
            callout: "Great for literacy block",
          },
          {
            badge: "Writing support",
            subhead: "Writing frames and response tools",
            callout: "Teacher-friendly routines",
          },
          {
            badge: "Close reading",
            subhead: "Evidence practice and student reflection",
            callout: "Workshop ready",
          },
          {
            badge: "Language arts",
            subhead: "Mentor tasks and print-ready pages",
            callout: "Built for classroom use",
          },
        ];
      case "Science":
        return [
          {
            badge: "Inquiry ready",
            subhead: "Observation pages and discussion prompts",
            callout: "Lab-friendly setup",
          },
          {
            badge: "Hands-on science",
            subhead: "Recording sheets and CER support",
            callout: "Easy to facilitate",
          },
          {
            badge: "Lab pack",
            subhead: "Prediction, evidence, and reflection",
            callout: "Made for active learning",
          },
          {
            badge: "STEM practice",
            subhead: "Science talk and notebook pages",
            callout: "Clear classroom flow",
          },
        ];
      default:
        return [
          {
            badge: "Inquiry pack",
            subhead: "Primary sources and discussion tasks",
            callout: "Social studies ready",
          },
          {
            badge: "Classroom history",
            subhead: "Reading pages and student response tools",
            callout: "Easy to teach",
          },
          {
            badge: "Civics resource",
            subhead: "Visual prompts and print-ready activities",
            callout: "Discussion-ready",
          },
          {
            badge: "Source analysis",
            subhead: "Graphic organizers and guided questions",
            callout: "Teacher created",
          },
        ];
    }
  })();

  return bySubject[variant];
}

function renderFormatBadgeMotif(format: string, theme: ReturnType<typeof getSubjectArtDirection>) {
  const lower = format.toLowerCase();

  if (lower.includes("slide") || lower.includes("deck")) {
    return `
      <rect x="610" y="392" width="206" height="250" rx="24" fill="#ffffff" opacity="0.98" />
      <rect x="638" y="426" width="150" height="18" rx="9" fill="${theme.badge}" />
      <rect x="638" y="462" width="114" height="18" rx="9" fill="${theme.badge}" />
      <rect x="638" y="510" width="150" height="92" rx="18" fill="${theme.tertiary}" />
    `;
  }

  if (lower.includes("toolkit") || lower.includes("bundle")) {
    return `
      <rect x="610" y="392" width="156" height="250" rx="24" fill="#ffffff" opacity="0.98" />
      <rect x="786" y="392" width="156" height="250" rx="24" fill="#ffffff" opacity="0.98" />
      <rect x="962" y="392" width="70" height="250" rx="24" fill="${theme.badge}" opacity="0.98" />
    `;
  }

  if (lower.includes("pack") || lower.includes("unit")) {
    return `
      <rect x="610" y="392" width="196" height="250" rx="24" fill="#ffffff" opacity="0.98" />
      <rect x="830" y="392" width="202" height="114" rx="20" fill="#ffffff" opacity="0.98" />
      <rect x="830" y="528" width="202" height="114" rx="20" fill="#ffffff" opacity="0.98" />
    `;
  }

  return `
    <rect x="610" y="392" width="196" height="250" rx="22" fill="#ffffff" opacity="0.96" />
    <rect x="832" y="392" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
    <rect x="832" y="484" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
    <rect x="832" y="576" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
  `;
}

function renderFormatThumbnailMotif(format: string, theme: ReturnType<typeof getSubjectArtDirection>) {
  const lower = format.toLowerCase();

  if (lower.includes("slide") || lower.includes("deck")) {
    return `
      <rect x="610" y="392" width="204" height="250" rx="24" fill="#ffffff" opacity="0.96" />
      <rect x="838" y="392" width="194" height="76" rx="18" fill="#ffffff" opacity="0.94" />
      <rect x="838" y="490" width="194" height="76" rx="18" fill="#ffffff" opacity="0.94" />
      <rect x="838" y="588" width="194" height="54" rx="18" fill="${theme.badge}" opacity="0.98" />
    `;
  }

  if (lower.includes("toolkit") || lower.includes("bundle")) {
    return `
      <rect x="610" y="392" width="126" height="250" rx="22" fill="#ffffff" opacity="0.96" />
      <rect x="758" y="392" width="126" height="250" rx="22" fill="#ffffff" opacity="0.96" />
      <rect x="906" y="392" width="126" height="250" rx="22" fill="#ffffff" opacity="0.96" />
    `;
  }

  if (lower.includes("pack") || lower.includes("unit")) {
    return `
      <rect x="610" y="392" width="196" height="250" rx="22" fill="#ffffff" opacity="0.96" />
      <rect x="832" y="392" width="200" height="110" rx="18" fill="#ffffff" opacity="0.94" />
      <rect x="832" y="524" width="200" height="118" rx="18" fill="#ffffff" opacity="0.94" />
    `;
  }

  return `
    <rect x="610" y="392" width="196" height="250" rx="22" fill="#ffffff" opacity="0.96" />
    <rect x="832" y="392" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
    <rect x="832" y="484" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
    <rect x="832" y="576" width="208" height="72" rx="18" fill="#ffffff" opacity="0.94" />
  `;
}

export function renderManagedPreviewSvg(input: {
  title: string;
  subject: string;
  gradeBand: string;
  summary: string;
  format?: string;
  sellerName?: string;
  pageNumber: number;
  pageCount: number;
}) {
  const subject = escapeXml(input.subject);
  const gradeBand = escapeXml(input.gradeBand);
  const sellerName = escapeXml(input.sellerName ?? "Teacher creator");
  const theme = getSubjectArtDirection(input.subject);
  const coverCopy = getCoverCopy(input);
  const titleLines = splitTitleLines(input.title, 20, 2);
  const titleFontSize = titleLines.length > 1 ? 52 : 56;
  const titleLineGap = 10;
  const titleStartY = 212;
  const titleEndY = titleStartY + (titleLines.length - 1) * (titleFontSize + titleLineGap);
  const subheadLines = splitTextLines(coverCopy.subhead, 34, 2);
  const subheadY = Math.min(320, titleEndY + 36);
  const sellerY = subheadY + (subheadLines.length - 1) * 32 + 34;
  const summaryLines = splitTextLines(input.summary, 36, 2);
  const previewSeed = `${input.title}:${input.gradeBand}:${input.pageNumber}`;
  const family = getProductFamily(input);
  const pageContent = getPreviewPageContent({
    subject: input.subject,
    family,
    pageNumber: input.pageNumber,
    pageCount: input.pageCount,
    format: input.format,
  });
  const detailLines = splitTextLines(pageContent.subtitle, 38, 2);
  const taskLines = pageContent.taskLines.map((line) => escapeXml(line));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="${escapeXml(input.title)} preview page ${input.pageNumber}">
  <rect width="1200" height="1600" fill="#eef2f7" />
  <rect x="64" y="64" width="1072" height="1472" rx="44" fill="#ffffff" stroke="#dbe4f0" />
  <rect x="96" y="96" width="1008" height="282" rx="34" fill="${theme.primary}" />
  <rect x="96" y="96" width="1008" height="282" rx="34" fill="url(#heroFade)" opacity="0.28" />
  <circle cx="972" cy="174" r="94" fill="rgba(255,255,255,0.1)" />
  <circle cx="904" cy="270" r="42" fill="rgba(255,255,255,0.16)" />
  <rect x="126" y="124" width="270" height="44" rx="22" fill="#fff4d6" />
  <text x="152" y="152" fill="${theme.ink}" font-size="15" font-family="Arial, sans-serif" font-weight="800" letter-spacing="1.2">${subject}</text>
  <rect x="412" y="124" width="208" height="44" rx="22" fill="rgba(255,255,255,0.16)" />
  <text x="444" y="152" fill="#ffffff" font-size="17" font-family="Arial, sans-serif" font-weight="700">${escapeXml(coverCopy.badge)}</text>
  <rect x="888" y="124" width="176" height="44" rx="22" fill="#ffffff" />
  <text x="920" y="152" fill="${theme.ink}" font-size="17" font-family="Arial, sans-serif" font-weight="800">${gradeBand}</text>
  ${renderTextLines(titleLines, 136, titleStartY, titleFontSize, "#ffffff", { fontWeight: 800, lineGap: titleLineGap })}
  ${renderTextLines(subheadLines, 136, subheadY, 22, "rgba(255,255,255,0.88)", { fontWeight: 500, lineGap: 10 })}
  <text x="136" y="${sellerY}" fill="rgba(255,255,255,0.74)" font-size="16" font-family="Arial, sans-serif">Created by ${sellerName}</text>
  <rect x="126" y="404" width="948" height="1062" rx="34" fill="#f8fafc" stroke="#e2e8f0" />
  <rect x="156" y="434" width="410" height="972" rx="28" fill="${theme.tertiary}" stroke="${theme.secondary}" />
  <rect x="192" y="468" width="338" height="40" rx="20" fill="${theme.badge}" />
  <text x="222" y="494" fill="${theme.ink}" font-size="17" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.pageLabel)}</text>
  ${renderFormatBadgeMotif(input.format ?? "resource", theme)}
  ${renderSubjectPreviewMotif(input.subject, previewSeed, family)}
  <rect x="612" y="448" width="426" height="232" rx="28" fill="#ffffff" stroke="#dbe4f0" />
  <text x="646" y="500" fill="${theme.ink}" font-size="28" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.mainTitle)}</text>
  ${renderTextLines(detailLines, 646, 544, 18, "#475569", { fontWeight: 400, lineGap: 8 })}
  <rect x="646" y="602" width="136" height="34" rx="17" fill="${theme.badge}" />
  <rect x="796" y="602" width="168" height="34" rx="17" fill="${theme.badge}" />
  <text x="672" y="625" fill="${theme.ink}" font-size="15" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.infoChips[0] ?? "Preview")}</text>
  <text x="822" y="625" fill="${theme.ink}" font-size="15" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.infoChips[1] ?? "Teacher notes")}</text>
  <rect x="612" y="718" width="426" height="230" rx="28" fill="#ffffff" stroke="#dbe4f0" />
  <text x="648" y="758" fill="${theme.ink}" font-size="22" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.taskTitle)}</text>
  <text x="648" y="804" fill="#475569" font-size="18" font-family="Arial, sans-serif">${taskLines[0]}</text>
  <text x="648" y="844" fill="#475569" font-size="18" font-family="Arial, sans-serif">${taskLines[1]}</text>
  <text x="648" y="884" fill="#475569" font-size="18" font-family="Arial, sans-serif">${taskLines[2]}</text>
  <rect x="648" y="878" width="154" height="48" rx="18" fill="${theme.badge}" />
  <rect x="826" y="878" width="172" height="48" rx="18" fill="${theme.badge}" />
  <text x="680" y="907" fill="${theme.ink}" font-size="18" font-family="Arial, sans-serif" font-weight="800">Readable</text>
  <text x="862" y="907" fill="${theme.ink}" font-size="18" font-family="Arial, sans-serif" font-weight="800">Protected</text>
  <rect x="612" y="986" width="426" height="208" rx="28" fill="#ffffff" stroke="#dbe4f0" />
  <rect x="648" y="1022" width="390" height="86" rx="22" fill="${theme.primary}" opacity="0.12" />
  <text x="680" y="1072" fill="${theme.ink}" font-size="28" font-family="Arial, sans-serif" font-weight="800">${escapeXml(pageContent.callout)}</text>
  ${renderTextLines(summaryLines, 648, 1148, 19, "#475569", { fontWeight: 400, lineGap: 8 })}
  <text x="188" y="1324" transform="rotate(-24 188 1324)" fill="rgba(147,197,253,0.2)" font-size="30" font-family="Arial, sans-serif" font-weight="800" letter-spacing="6">LESSONFORGE PREVIEW · SAMPLE ONLY</text>
  <defs>
    <linearGradient id="heroFade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="${theme.secondary}" />
    </linearGradient>
  </defs>
</svg>`;
}

export function renderManagedThumbnailSvg(input: {
  title: string;
  subject: string;
  gradeBand: string;
  format: string;
  sellerName?: string;
}) {
  const subject = escapeXml(input.subject);
  const gradeBand = escapeXml(input.gradeBand);
  const format = escapeXml(input.format);
  const sellerName = escapeXml(input.sellerName ?? "Teacher creator");
  const theme = getSubjectArtDirection(input.subject);
  const thumbnailSeed = `${input.title}:${input.gradeBand}:${input.format}`;
  const coverCopy = getCoverCopy(input);
  const titleLines = splitTitleLines(input.title, 18, 2);
  const titleFontSize = titleLines.length > 1 ? 50 : 56;
  const titleLineGap = 8;
  const titleStartY = 230;
  const titleEndY = titleStartY + (titleLines.length - 1) * (titleFontSize + titleLineGap);
  const subheadLines = splitTextLines(coverCopy.subhead, 34, 2);
  const subheadY = Math.min(336, titleEndY + 34);
  const sellerY = subheadY + (subheadLines.length - 1) * 30 + 30;
  const family = getProductFamily(input);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(input.title)} thumbnail">
  <rect width="1200" height="900" fill="#eef2f7" />
  <rect x="48" y="48" width="1104" height="804" rx="42" fill="#ffffff" stroke="#dbe4f0" />
  <rect x="86" y="86" width="1028" height="728" rx="34" fill="${theme.primary}" />
  <rect x="86" y="86" width="1028" height="728" rx="34" fill="url(#thumbFade)" opacity="0.3" />
  <circle cx="994" cy="182" r="94" fill="rgba(255,255,255,0.1)" />
  <circle cx="922" cy="286" r="40" fill="rgba(255,255,255,0.15)" />
  <rect x="124" y="124" width="282" height="44" rx="22" fill="#fff4d6" />
  <text x="150" y="152" fill="${theme.ink}" font-size="15" font-family="Arial, sans-serif" font-weight="800" letter-spacing="1.2">${subject}</text>
  <rect x="424" y="124" width="198" height="44" rx="22" fill="rgba(255,255,255,0.16)" />
  <text x="452" y="152" fill="#ffffff" font-size="17" font-family="Arial, sans-serif" font-weight="700">${escapeXml(coverCopy.badge)}</text>
  <rect x="922" y="124" width="156" height="44" rx="22" fill="#ffffff" />
  <text x="952" y="152" fill="${theme.ink}" font-size="17" font-family="Arial, sans-serif" font-weight="800">${gradeBand}</text>
  ${renderTextLines(titleLines, 124, titleStartY, titleFontSize, "#ffffff", { fontWeight: 800, lineGap: titleLineGap })}
  ${renderTextLines(subheadLines, 124, subheadY, 22, "rgba(255,255,255,0.88)", { fontWeight: 500, lineGap: 8 })}
  <text x="124" y="${sellerY}" fill="rgba(255,255,255,0.76)" font-size="16" font-family="Arial, sans-serif">Created by ${sellerName}</text>
  <rect x="124" y="408" width="444" height="346" rx="28" fill="#ffffff" opacity="0.96" />
  <rect x="600" y="408" width="474" height="346" rx="28" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.32)" />
  ${renderFormatThumbnailMotif(input.format, theme)}
  ${renderSubjectThumbnailMotif(input.subject, thumbnailSeed, family)}
  <text x="160" y="472" fill="${theme.ink}" font-size="20" font-family="Arial, sans-serif" font-weight="800">${escapeXml(coverCopy.callout)}</text>
  <rect x="160" y="518" width="162" height="38" rx="19" fill="${theme.badge}" />
  <text x="188" y="543" fill="${theme.ink}" font-size="17" font-family="Arial, sans-serif" font-weight="800">${format}</text>
  <rect x="160" y="582" width="190" height="96" rx="22" fill="${theme.badge}" />
  <rect x="374" y="582" width="158" height="96" rx="22" fill="${theme.badge}" />
  <text x="192" y="636" fill="${theme.ink}" font-size="20" font-family="Arial, sans-serif" font-weight="800">Printable pages</text>
  <text x="404" y="636" fill="${theme.ink}" font-size="20" font-family="Arial, sans-serif" font-weight="800">Preview included</text>
  <text x="820" y="710" fill="${theme.ink}" font-size="17" font-family="Arial, sans-serif" font-weight="700">Clean, classroom-ready layout</text>
  <text x="170" y="784" transform="rotate(-24 170 784)" fill="rgba(255,255,255,0.18)" font-size="30" font-family="Arial, sans-serif" font-weight="800" letter-spacing="6">LESSONFORGE PREVIEW · SAMPLE ONLY</text>
  <defs>
    <linearGradient id="thumbFade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="${theme.secondary}" />
    </linearGradient>
  </defs>
</svg>`;
}

"use client";

import type { PreviewImageDraft } from "@/lib/lessonforge/file-preview-images";

export type GeneratedThumbnailOption = {
  id: string;
  label: string;
  templateKey: "bold-preview" | "split-preview" | "badge-banner" | "stacked-preview";
  pageNumbers: number[];
  file: File;
  objectUrl: string;
};

type ThumbnailPalette = {
  surface: string;
  surfaceSoft: string;
  accent: string;
  accentSoft: string;
  text: string;
  badge: string;
};

const THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 900;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function subjectPalette(subject: string): ThumbnailPalette {
  switch (subject.toLowerCase()) {
    case "ela":
    case "reading":
    case "writing":
      return {
        surface: "#fff7ed",
        surfaceSoft: "#ffedd5",
        accent: "#c2410c",
        accentSoft: "#fdba74",
        text: "#431407",
        badge: "#7c2d12",
      };
    case "science":
      return {
        surface: "#ecfdf5",
        surfaceSoft: "#d1fae5",
        accent: "#047857",
        accentSoft: "#6ee7b7",
        text: "#052e16",
        badge: "#065f46",
      };
    case "social studies":
      return {
        surface: "#eff6ff",
        surfaceSoft: "#dbeafe",
        accent: "#1d4ed8",
        accentSoft: "#93c5fd",
        text: "#172554",
        badge: "#1e3a8a",
      };
    default:
      return {
        surface: "#f8fafc",
        surfaceSoft: "#e2e8f0",
        accent: "#0f766e",
        accentSoft: "#99f6e4",
        text: "#0f172a",
        badge: "#134e4a",
      };
  }
}

function wrapText(value: string, maxLineLength: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxLineLength) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3);
}

function createTextBlock(lines: string[], x: number, y: number, palette: ThumbnailPalette) {
  return lines
    .map(
      (line, index) => `
        <text x="${x}" y="${y + index * 72}" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="56" font-weight="700">
          ${escapeXml(line)}
        </text>`,
    )
    .join("");
}

function createBadge(label: string, x: number, y: number, palette: ThumbnailPalette) {
  const width = Math.max(120, label.length * 12 + 44);
  return `
    <rect x="${x}" y="${y}" width="${width}" height="44" rx="22" fill="${palette.badge}" />
    <text x="${x + 22}" y="${y + 29}" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" letter-spacing="1.2">${escapeXml(label)}</text>
  `;
}

function createPreviewImage(dataUrl: string, x: number, y: number, width: number, height: number, clipId: string) {
  return `
    <defs>
      <clipPath id="${clipId}">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" />
      </clipPath>
    </defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="#ffffff" />
    <image href="${dataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="none" stroke="rgba(15,23,42,0.12)" />
  `;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read preview image."));
    reader.readAsDataURL(file);
  });
}

async function svgToPngFile(svg: string, fileName: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to render thumbnail preview."));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare thumbnail rendering.");
    }

    context.drawImage(image, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (!value) {
          reject(new Error("Unable to export thumbnail option."));
          return;
        }

        resolve(value);
      }, "image/png");
    });

    return new File([blob], fileName, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function buildSvgTemplate(input: {
  templateKey: GeneratedThumbnailOption["templateKey"];
  title: string;
  subject: string;
  gradeBand: string;
  previewImages: string[];
}) {
  const palette = subjectPalette(input.subject);
  const titleLines = wrapText(truncate(input.title || "Classroom resource", 72), 24);
  const badges = [
    createBadge(input.gradeBand || "K-5", 70, 62, palette),
    createBadge(input.subject || "Math", 240, 62, palette),
  ].join("");

  switch (input.templateKey) {
    case "bold-preview":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" viewBox="0 0 ${THUMBNAIL_WIDTH} ${THUMBNAIL_HEIGHT}">
          <rect width="100%" height="100%" fill="${palette.surface}" />
          <rect x="0" y="0" width="100%" height="210" fill="${palette.surfaceSoft}" />
          ${badges}
          ${createTextBlock(titleLines, 70, 220, palette)}
          ${createPreviewImage(input.previewImages[0], 640, 130, 470, 620, "thumb-bold-preview")}
          <rect x="70" y="500" width="470" height="220" rx="28" fill="${palette.accent}" opacity="0.12" />
          <text x="110" y="570" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700">Real page preview</text>
          <text x="110" y="625" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">Built from the uploaded PDF</text>
        </svg>`;
    case "split-preview":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" viewBox="0 0 ${THUMBNAIL_WIDTH} ${THUMBNAIL_HEIGHT}">
          <rect width="100%" height="100%" fill="${palette.surface}" />
          <rect x="0" y="0" width="470" height="100%" fill="${palette.accent}" opacity="0.08" />
          ${createPreviewImage(input.previewImages[0], 60, 90, 390, 720, "thumb-split-preview")}
          ${badges}
          ${createTextBlock(titleLines, 520, 240, palette)}
          <rect x="520" y="520" width="540" height="170" rx="28" fill="#ffffff" />
          <text x="560" y="590" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700">Professional preview option</text>
          <text x="560" y="645" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">Uses a real page from the uploaded file</text>
        </svg>`;
    case "badge-banner":
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" viewBox="0 0 ${THUMBNAIL_WIDTH} ${THUMBNAIL_HEIGHT}">
          <rect width="100%" height="100%" fill="${palette.surface}" />
          <rect x="60" y="70" width="1080" height="170" rx="40" fill="${palette.accent}" />
          <text x="96" y="142" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="1.6">${escapeXml((input.subject || "Math").toUpperCase())}</text>
          <text x="96" y="204" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="56" font-weight="700">${escapeXml(truncate(input.title, 42))}</text>
          ${createBadge(input.gradeBand || "K-5", 930, 120, { ...palette, badge: "#ffffff" }).replace(/fill="#ffffff"/g, `fill="${palette.surface}"`).replace(new RegExp(palette.badge, "g"), palette.accent)}
          ${createPreviewImage(input.previewImages[0], 90, 300, 460, 500, "thumb-banner-primary")}
          ${createPreviewImage(input.previewImages[1] || input.previewImages[0], 610, 300, 460, 500, "thumb-banner-secondary")}
        </svg>`;
    case "stacked-preview":
    default:
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" viewBox="0 0 ${THUMBNAIL_WIDTH} ${THUMBNAIL_HEIGHT}">
          <rect width="100%" height="100%" fill="${palette.surface}" />
          ${badges}
          ${createTextBlock(titleLines, 70, 190, palette)}
          ${createPreviewImage(input.previewImages[0], 720, 110, 320, 420, "thumb-stack-primary")}
          ${createPreviewImage(input.previewImages[1] || input.previewImages[0], 640, 320, 320, 420, "thumb-stack-secondary")}
          ${createPreviewImage(input.previewImages[2] || input.previewImages[0], 560, 530, 320, 250, "thumb-stack-tertiary")}
          <rect x="70" y="500" width="360" height="170" rx="30" fill="#ffffff" />
          <text x="110" y="570" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700">Stacked page preview</text>
          <text x="110" y="625" fill="${palette.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">Shows real inside pages</text>
        </svg>`;
  }
}

export async function generateThumbnailOptions(input: {
  title: string;
  subject: string;
  gradeBand: string;
  previewPages: PreviewImageDraft[];
  variantSeed?: number;
}) {
  const previewSourcePages = input.previewPages.length > 0 ? input.previewPages : [];

  if (previewSourcePages.length === 0) {
    throw new Error("Add preview pages before generating thumbnail options.");
  }

  const orderedPages =
    input.variantSeed && previewSourcePages.length > 1
      ? previewSourcePages
          .slice(input.variantSeed % previewSourcePages.length)
          .concat(previewSourcePages.slice(0, input.variantSeed % previewSourcePages.length))
      : previewSourcePages;

  const previewDataUrls = await Promise.all(
    orderedPages.slice(0, 3).map((page) => fileToDataUrl(page.file)),
  );

  const templates: Array<{
    key: GeneratedThumbnailOption["templateKey"];
    label: string;
    pageNumbers: number[];
  }> = [
    {
      key: "bold-preview",
      label: "Bold title with real page preview",
      pageNumbers: [orderedPages[0]?.pageNumber ?? 1],
    },
    {
      key: "split-preview",
      label: "Split layout with preview and title",
      pageNumbers: [orderedPages[0]?.pageNumber ?? 1],
    },
    {
      key: "badge-banner",
      label: "Clean banner with grade and subject badges",
      pageNumbers: [
        orderedPages[0]?.pageNumber ?? 1,
        orderedPages[1]?.pageNumber ?? orderedPages[0]?.pageNumber ?? 1,
      ],
    },
    {
      key: "stacked-preview",
      label: "Stacked real page preview layout",
      pageNumbers: orderedPages.slice(0, 3).map((page) => page.pageNumber),
    },
  ];

  const files = await Promise.all(
    templates.map(async (template) => {
      const svg = buildSvgTemplate({
        templateKey: template.key,
        title: input.title,
        subject: input.subject,
        gradeBand: input.gradeBand,
        previewImages: previewDataUrls,
      });
      const file = await svgToPngFile(
        svg,
        `${template.key}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "thumbnail"}.png`,
      );

      return {
        id: template.key,
        label: template.label,
        templateKey: template.key,
        pageNumbers: template.pageNumbers,
        file,
        objectUrl: URL.createObjectURL(file),
      } satisfies GeneratedThumbnailOption;
    }),
  );

  return files;
}

export function revokeGeneratedThumbnailOptions(options: GeneratedThumbnailOption[]) {
  for (const option of options) {
    URL.revokeObjectURL(option.objectUrl);
  }
}

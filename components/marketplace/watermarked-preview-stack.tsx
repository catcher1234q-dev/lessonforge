import type { ManagedPreviewAsset } from "@/lib/lessonforge/preview-assets";

type WatermarkedPreviewStackProps = {
  title: string;
  subject: string;
  gradeBand: string;
  format: string;
  standardsTag: string;
  summary: string;
  sellerName?: string;
  includedItems?: string[];
  fileTypes?: string[];
  previewLabels?: string[];
  previewAssets?: ManagedPreviewAsset[];
  className?: string;
};

type PreviewPage = {
  eyebrow: string;
  title: string;
  body: string[];
  footer: string;
  accentLabel: string;
};

function PreviewAssetPanel({
  asset,
  footer,
  openClassName,
}: {
  asset?: ManagedPreviewAsset;
  footer: string;
  openClassName: string;
}) {
  if (!asset?.previewUrl) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Protected preview</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{footer}</p>
        <div className="mt-4">
          <span className="inline-flex h-10 items-center rounded-full bg-slate-300 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            Unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <img
            alt={asset.label}
            className="h-full w-full object-cover object-top"
            decoding="async"
            loading="lazy"
            sizes="80px"
            src={asset.previewUrl}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Protected preview</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{asset.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{asset.pageRangeLabel ?? footer}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{footer}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <a
          className={`inline-flex h-10 items-center rounded-full ${openClassName} px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white`}
          href={asset.previewUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open
        </a>
      </div>
    </div>
  );
}

function getSubjectPalette(subject: string) {
  switch (subject) {
    case "Math":
      return {
        accent: "bg-blue-600",
        accentSoft: "bg-blue-50 text-blue-700",
        inkSoft: "text-blue-700",
      };
    case "ELA":
      return {
        accent: "bg-amber-500",
        accentSoft: "bg-amber-50 text-amber-700",
        inkSoft: "text-amber-700",
      };
    case "Science":
      return {
        accent: "bg-emerald-600",
        accentSoft: "bg-emerald-50 text-emerald-700",
        inkSoft: "text-emerald-700",
      };
    default:
      return {
        accent: "bg-violet-600",
        accentSoft: "bg-violet-50 text-violet-700",
        inkSoft: "text-violet-700",
      };
  }
}

function getSubjectTasks(subject: string) {
  switch (subject) {
    case "Math":
      return [
        "Solve the worked example and explain the strategy.",
        "Complete the guided practice with models and number lines.",
      ];
    case "ELA":
      return [
        "Read the passage and underline one piece of text evidence.",
        "Use the discussion stems before writing the response.",
      ];
    case "Science":
      return [
        "Record two careful observations from the sample phenomenon.",
        "Use the CER organizer to connect evidence to a claim.",
      ];
    default:
      return [
        "Study the source set and mark the details that stand out.",
        "Use the organizer to compare claims and evidence.",
      ];
  }
}

function buildPreviewPages(props: WatermarkedPreviewStackProps): PreviewPage[] {
  const tasks = getSubjectTasks(props.subject);
  const labels = props.previewAssets?.map((asset) => asset.label) ?? props.previewLabels ?? [
    "Cover page",
    "Student preview",
    "Teacher notes",
  ];

  return [
    {
      eyebrow: labels[0] ?? "Cover page",
      title: props.title,
      body: [
        `${props.subject} · ${props.gradeBand}`,
        `${props.format} aligned to ${props.standardsTag}`,
        props.summary,
      ],
      footer: `Seller preview: ${props.sellerName ?? "LessonForge creator"}`,
      accentLabel: "Cover page",
    },
    {
      eyebrow: labels[1] ?? "Student preview",
      title: "Inside the resource",
      body: tasks,
      footer: "Student-facing pages shown as a protected preview",
      accentLabel: "Student preview",
    },
    {
      eyebrow: labels[2] ?? "Teacher notes",
      title: "Implementation support",
      body: [
        "Suggested pacing and prep notes for immediate classroom use.",
        "Differentiation ideas for reteach or extension.",
        "Answer key and full teacher guidance stay locked until purchase.",
      ],
      footer: "Includes teacher notes, pacing, and answer-key guidance",
      accentLabel: "Teacher notes",
    },
  ];
}

function WatermarkLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-x-[-20%] top-[16%] rotate-[-24deg] text-[20px] font-semibold uppercase tracking-[0.34em] text-slate-200/70">
        LessonForge Preview LessonForge Preview LessonForge Preview
      </div>
      <div className="absolute inset-x-[-18%] top-[46%] rotate-[-24deg] text-[20px] font-semibold uppercase tracking-[0.34em] text-slate-200/60">
        Sample Only LessonForge Preview Sample Only LessonForge Preview
      </div>
      <div className="absolute inset-x-[-22%] top-[76%] rotate-[-24deg] text-[20px] font-semibold uppercase tracking-[0.34em] text-slate-200/65">
        Protected Preview Protected Preview Protected Preview
      </div>
    </div>
  );
}

function buildCoverHighlights(props: WatermarkedPreviewStackProps) {
  return [
    props.standardsTag,
    props.includedItems?.[0] ?? `${props.format} teacher guide`,
    props.fileTypes?.join(" · ") ?? "PDF · editable files",
  ].filter(Boolean);
}

function getPreviewAccentLabel(subject: string) {
  switch (subject) {
    case "Math":
      return "Practice pages";
    case "ELA":
      return "Reading workshop";
    case "Science":
      return "Lab-ready";
    default:
      return "Classroom-ready";
  }
}

function PreviewSheet({
  page,
  index,
  asset,
  palette,
  props,
}: {
  page: PreviewPage;
  index: number;
  asset?: ManagedPreviewAsset;
  palette: ReturnType<typeof getSubjectPalette>;
  props: WatermarkedPreviewStackProps;
}) {
  const coverHighlights = buildCoverHighlights(props);

  if (index === 0) {
    return (
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div className={`px-7 py-6 text-white ${palette.accent}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
              {props.gradeBand}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              {props.format}
            </span>
          </div>
          <h4 className="mt-5 max-w-[18rem] text-[2.6rem] font-semibold leading-[0.98] text-white">
            {props.title}
          </h4>
          <p className="mt-4 max-w-[22rem] text-base leading-7 text-white/85">{props.summary}</p>
        </div>

        <div className="relative p-7">
          <WatermarkLayer />
          {asset?.previewUrl ? (
            <div className="relative z-10 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <img
                alt={asset.label}
                className="h-80 w-full object-cover object-top"
                decoding="async"
                loading="lazy"
                sizes="(min-width: 768px) 520px, 100vw"
                src={asset.previewUrl}
              />
            </div>
          ) : null}
          <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-3">
            {coverHighlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <div className="relative p-7">
          <WatermarkLayer />
          <div className="relative z-10 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Student preview
                </p>
                <h4 className="mt-2 text-[2.3rem] font-semibold leading-[1.02] text-slate-950">
                  {page.title}
                </h4>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.accentSoft}`}>
                {getPreviewAccentLabel(props.subject)}
              </span>
            </div>

            {asset?.previewUrl ? (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <img
                  alt={asset.label}
                  className="h-96 w-full object-cover object-top"
                  decoding="async"
                  loading="lazy"
                  sizes="(min-width: 768px) 520px, 100vw"
                  src={asset.previewUrl}
                />
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.body.slice(1).map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-700"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="relative p-7">
        <WatermarkLayer />
        <div className="relative z-10 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Teacher guide
              </p>
              <h4 className="mt-2 text-[2.2rem] font-semibold leading-[1.02] text-slate-950">
                {page.title}
              </h4>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.accentSoft}`}>
              {props.subject}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {page.body.map((line) => (
              <div
                key={line}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
        {asset?.previewUrl ? (
          <div className="relative z-10 mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <img
              alt={asset.label}
              className="h-72 w-full object-cover object-top"
              decoding="async"
              loading="lazy"
              sizes="(min-width: 768px) 520px, 100vw"
              src={asset.previewUrl}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WatermarkedPreviewStack({
  className,
  ...props
}: WatermarkedPreviewStackProps) {
  const palette = getSubjectPalette(props.subject);
  const pages = buildPreviewPages(props);
  const previewAssets = props.previewAssets ?? [];

  return (
    <div className={className}>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
              Before purchase
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              What buyers can actually preview
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Buyers can inspect a few protected preview pages before checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
              {props.gradeBand}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
              {props.format}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
              {props.standardsTag}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {pages.map((page, index) => {
            const asset = previewAssets[index];

            return (
              <article
                key={`${page.eyebrow}-${index}`}
                className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {page.eyebrow}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {page.accentLabel}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.accentSoft}`}
                  >
                    {props.subject}
                  </span>
                </div>

                {asset?.previewUrl ? (
                  <div className="relative overflow-hidden bg-white">
                    <img
                      alt={asset.label}
                      className="h-60 w-full object-cover object-top"
                      decoding="async"
                      loading="lazy"
                      sizes="(min-width: 768px) 520px, 100vw"
                      src={asset.previewUrl}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="rounded-[18px] border border-white/30 bg-gradient-to-t from-slate-950/92 via-slate-900/72 to-slate-900/10 p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/72">
                          Protected preview
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white">
                          {asset.label}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-sm text-slate-500">
                    Preview unavailable
                  </div>
                )}

                <div className="space-y-3 p-4">
                  <p className="text-sm leading-6 text-slate-600">
                    {index === 0
                      ? "Use this to judge the overall style first."
                      : index === 1
                        ? "Use this to see what students would actually work on."
                        : "Use this to see the teacher-facing support included."}
                  </p>
                  {asset?.previewUrl ? (
                    <a
                      className={`inline-flex h-10 items-center rounded-full ${palette.accent} px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white`}
                      href={asset.previewUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open preview
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

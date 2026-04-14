"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { mapStandardsWithGemini, mapStandardsWithOpenAI } from "@/lib/ai/providers";
import { standardsMappingExamples } from "@/lib/demo/example-resources";
import type { AIProviderResult } from "@/types";

const providers = [
  {
    id: "openai",
    label: "OpenAI",
    helper: "Balanced classification for short resource descriptions",
  },
  {
    id: "gemini",
    label: "Gemini",
    helper: "Alternative provider path for multi-model flexibility",
  },
] as const;

export function StandardsMapperDemo() {
  const [selectedExample, setSelectedExample] = useState(standardsMappingExamples[0]?.id ?? "");
  const [selectedProvider, setSelectedProvider] = useState<(typeof providers)[number]["id"]>("openai");
  const [resourceTitle, setResourceTitle] = useState(standardsMappingExamples[0]?.title ?? "");
  const [resourceExcerpt, setResourceExcerpt] = useState(standardsMappingExamples[0]?.excerpt ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIProviderResult | null>(null);

  const activeExample = useMemo(
    () =>
      standardsMappingExamples.find((example) => example.id === selectedExample) ??
      standardsMappingExamples[0],
    [selectedExample],
  );

  const activeProvider = providers.find((provider) => provider.id === selectedProvider) ?? providers[0];

  useEffect(() => {
    setResourceTitle(activeExample.title);
    setResourceExcerpt(activeExample.excerpt);
    setResult(null);
  }, [activeExample]);

  async function handleAnalyze() {
    setIsAnalyzing(true);

    const mapped =
      selectedProvider === "openai"
        ? await mapStandardsWithOpenAI({
            title: resourceTitle,
            excerpt: resourceExcerpt,
          })
        : await mapStandardsWithGemini({
            title: resourceTitle,
            excerpt: resourceExcerpt,
          });

    setResult(mapped);
    setIsAnalyzing(false);
  }

  return (
    <section id="standards-mapper" className="px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            AI Standards Mapper
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink sm:text-4xl">
            Show the Common Core tagging story right on the website.
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            Visitors can preview how LessonForge reads a resource excerpt, suggests
            a standard, and explains why the match makes sense.
          </p>

          <div className="mt-8 grid gap-3">
            {standardsMappingExamples.map((example) => (
              <button
                key={example.id}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  example.id === activeExample.id
                    ? "border-brand/20 bg-brand-soft"
                    : "border-ink/5 bg-white hover:border-brand/15 hover:bg-surface-subtle"
                }`}
                onClick={() => setSelectedExample(example.id)}
                type="button"
              >
                <p className="text-sm font-semibold text-ink">{example.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {example.subject} · {example.gradeBand}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <div className="flex flex-wrap gap-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  provider.id === activeProvider.id
                    ? "bg-brand text-white"
                    : "bg-surface-subtle text-ink-soft hover:bg-brand-soft hover:text-brand"
                }`}
                onClick={() => setSelectedProvider(provider.id)}
                type="button"
              >
                {provider.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-muted">
                Resource title
              </label>
              <input
                className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                onChange={(event) => setResourceTitle(event.target.value)}
                value={resourceTitle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-muted">
                Resource excerpt
              </label>
              <textarea
                className="mt-2 min-h-36 w-full rounded-[1.5rem] border border-ink/10 bg-surface-subtle px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-brand"
                onChange={(event) => setResourceExcerpt(event.target.value)}
                value={resourceExcerpt}
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
              disabled={isAnalyzing || !resourceExcerpt.trim()}
              onClick={() => void handleAnalyze()}
              type="button"
            >
              {isAnalyzing ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Analyzing resource
                </>
              ) : (
                "Run standards mapping"
              )}
            </button>
          </div>

          <div className="mt-6 rounded-[1.5rem] bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-brand-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                {activeProvider.label} suggestion
              </p>
            </div>
            <p className="mt-4 text-sm text-white/60">
              {result?.subject || activeExample.subject}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {result?.suggestedStandard || activeExample.suggestedStandard}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/70">
              {result?.rationale || activeExample.rationale}
            </p>
            <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Confidence {result?.confidence || "88%"}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-ink-muted">{activeProvider.helper}</p>
        </div>
      </div>
    </section>
  );
}

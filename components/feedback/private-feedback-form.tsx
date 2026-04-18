"use client";

import { useEffect, useState } from "react";

import type { FeedbackRating } from "@/types";

const ratings: FeedbackRating[] = ["Easy", "Okay", "Confusing"];

export function PrivateFeedbackForm({
  source = "feedback_page",
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const [rating, setRating] = useState<FeedbackRating | "">("");
  const [confusingText, setConfusingText] = useState("");
  const [improvementText, setImprovementText] = useState("");
  const [contact, setContact] = useState("");
  const [pageContext, setPageContext] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPageContext(window.location.pathname + window.location.search);
  }, []);

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/lessonforge/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: rating || undefined,
        confusingText,
        improvementText,
        contact,
        pageContext,
        source,
      }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Unable to save feedback right now.");
      setIsSubmitting(false);
      return;
    }

    setRating("");
    setConfusingText("");
    setImprovementText("");
    setContact("");
    setMessage("Thank you. Your feedback was sent privately to the LessonForgeHub owner.");
    setIsSubmitting(false);
  }

  return (
    <div
      className={`rounded-[1.5rem] border border-ink/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Private feedback
        </p>
        <h2 className={`mt-3 font-semibold text-ink ${compact ? "text-xl" : "text-2xl"}`}>
          How was this experience?
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          This goes only to the LessonForgeHub owner. It is not a public review, rating, or testimonial.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {ratings.map((option) => (
          <button
            key={option}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              rating === option
                ? "border-brand bg-brand text-white"
                : "border-slate-200 bg-white text-ink hover:border-slate-300"
            }`}
            onClick={() => setRating(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-ink">
            What was confusing or frustrating?
          </span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
            onChange={(event) => setConfusingText(event.target.value)}
            placeholder="Tell us what felt unclear, slow, missing, or hard to use."
            value={confusingText}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">What would you improve?</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
            onChange={(event) => setImprovementText(event.target.value)}
            placeholder="Share one thing that would make LessonForgeHub easier or more useful."
            value={improvementText}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">
            Optional email or contact
          </span>
          <input
            className="mt-2 w-full rounded-[1.15rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
            onChange={(event) => setContact(event.target.value)}
            placeholder="Only add this if you want a reply."
            type="text"
            value={contact}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {isSubmitting ? "Sending feedback" : "Send private feedback"}
        </button>
        {message ? (
          <p className="text-sm leading-6 text-ink-soft">{message}</p>
        ) : null}
      </div>
    </div>
  );
}

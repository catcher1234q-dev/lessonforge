"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import type { ReviewRecord, Viewer } from "@/types";

export function ReviewPanel({
  productId,
  productTitle,
  initialReviews,
  viewer,
}: {
  productId: string;
  productTitle: string;
  initialReviews: ReviewRecord[];
  viewer: Viewer;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [title, setTitle] = useState("Great classroom fit");
  const [body, setBody] = useState(
    "The instructions were clear and the resource felt ready to use right away.",
  );
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);

    const response = await fetch("/api/lessonforge/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        productTitle,
        rating,
        title,
        body,
        buyerName: viewer.name,
        buyerEmail: viewer.email,
      }),
    });

    const payload = (await response.json()) as {
      review?: ReviewRecord;
      error?: string;
    };

    if (!response.ok || !payload.review) {
      setMessage(payload.error || "Unable to submit review.");
      return;
    }

    setReviews((current) => [payload.review!, ...current]);
    setMessage("Verified review added.");
  }

  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-semibold text-ink">Verified purchaser reviews</h2>
      <div className="mt-6 space-y-4">
        {reviews.length ? (
          reviews.map((review) => (
            <article key={review.id} className="rounded-[24px] bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-amber-500">
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Star key={`${review.id}-${index}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-ink">{review.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{review.body}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
                {review.buyerName} · verified purchase
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-ink-soft">
            No verified reviews yet. Complete a purchase first, then add one.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-4">
        <div className="rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink">
          Reviewing as {viewer.name} ({viewer.email})
        </div>
        <input
          className="rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Review title"
          value={title}
        />
        <textarea
          className="min-h-24 rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Review body"
          value={body}
        />
        <select
          className="rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none"
          onChange={(event) => setRating(Number(event.target.value))}
          value={rating}
        >
          <option value={5}>5 stars</option>
          <option value={4}>4 stars</option>
          <option value={3}>3 stars</option>
          <option value={2}>2 stars</option>
          <option value={1}>1 star</option>
        </select>
        <button
          className="inline-flex justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          onClick={() => void handleSubmit()}
          type="button"
        >
          Submit verified review
        </button>
        {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
      </div>
    </section>
  );
}

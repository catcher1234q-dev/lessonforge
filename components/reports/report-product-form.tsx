"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const reportCategories = [
  "Broken file",
  "Copyright",
  "Misleading listing",
  "Low quality",
  "Spam",
  "Access issue",
] as const;

type ReportProductFormProps = {
  productId: string;
  productTitle: string;
  returnTo: string;
  viewerRole: string;
  supportEmail: string;
};

export function ReportProductForm({
  productId,
  productTitle,
  returnTo,
  viewerRole,
  supportEmail,
}: ReportProductFormProps) {
  const [category, setCategory] =
    useState<(typeof reportCategories)[number]>("Misleading listing");
  const [details, setDetails] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = viewerRole === "buyer";
  const supportHref = useMemo(() => {
    const subject = encodeURIComponent(`Report product: ${productTitle}`);
    const body = encodeURIComponent(
      `Product: ${productTitle}\nProduct ID: ${productId}\n\nWhat should we review?\n`,
    );

    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }, [productId, productTitle, supportEmail]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setStatusMessage(
        "Signed-in buyer access is required for direct product reports. You can still email support below.",
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/lessonforge/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report: {
            id: `report-${Date.now()}`,
            productId,
            productTitle,
            category,
            details: details.trim() || "Buyer submitted a product report from the product page.",
            status: "Open",
          },
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit report.");
      }

      setDetails("");
      setStatusMessage(
        `Report submitted for ${productTitle}. The LessonForgeHub team can now review it.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to submit report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink" htmlFor="report-category">
              Report category
            </label>
            <select
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand"
              id="report-category"
              onChange={(event) =>
                setCategory(event.target.value as (typeof reportCategories)[number])
              }
              value={category}
            >
              {reportCategories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-ink-soft">
            <p className="font-semibold text-ink">Who can submit directly</p>
            <p className="mt-1">
              Signed-in buyers can file reports here. Everyone else can still contact support for review.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink" htmlFor="report-details">
            What should we review?
          </label>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-brand"
            id="report-details"
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Share the issue clearly. For example: the preview does not match the file, the resource looks copied, or the listing is misleading."
            value={details}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Submitting report..." : "Submit product report"}
          </button>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            href={supportHref}
          >
            Email support instead
          </a>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
            href={returnTo}
          >
            Back to listing
          </Link>
        </div>

        {statusMessage ? (
          <p className="text-sm leading-6 text-ink-soft">{statusMessage}</p>
        ) : null}
      </form>

      <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        Reports help LessonForgeHub review broken files, misleading listings, copyright concerns, and other policy issues. Listings that violate policy may be removed.
      </div>
    </div>
  );
}

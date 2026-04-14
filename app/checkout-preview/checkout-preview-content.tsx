"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Receipt,
  X,
} from "lucide-react";

import { SectionIntro } from "@/components/shared/section-intro";
import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import { getCheckoutReturnLabel } from "@/lib/lessonforge/checkout-preview";
import { CHECKOUT_CONFIRMATION_REMINDER_STORAGE_KEY } from "@/lib/local/storage";
import { formatCurrency } from "@/lib/marketplace/config";
import type { Viewer } from "@/types";

export function CheckoutPreviewContent({ viewer }: { viewer: Viewer }) {
  const searchParams = useSearchParams();
  const purchaseError = searchParams.get("purchaseError");
  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirmationReminder, setShowConfirmationReminder] = useState(false);
  const [skipReminderNextTime, setSkipReminderNextTime] = useState(false);
  const [shouldShowReminder, setShouldShowReminder] = useState(true);

  const normalizedPurchaseError = useMemo(() => {
    if (!purchaseError) {
      return null;
    }

    if (
      purchaseError.includes("EROFS") ||
      purchaseError.toLowerCase().includes("read-only file system")
    ) {
      return "Preview purchases cannot be completed on the hosted site until the real database setup is connected. Use this page as a final review step for now, then test the real Stripe checkout flow after database setup is finished.";
    }

    return purchaseError;
  }, [purchaseError]);

  const details = useMemo(() => {
    const productId = searchParams.get("productId") || searchParams.get("title") || "teacher-resource";
    const title = searchParams.get("title") || "Teacher resource";
    const priceCents = Number(searchParams.get("priceCents") || 0);
    const sellerName = searchParams.get("sellerName") || "Teacher seller";
    const sellerId = searchParams.get("sellerId") || sellerName.toLowerCase().replace(/\s+/g, "-");
    const teacherPayoutCents = Number(searchParams.get("teacherPayoutCents") || 0);
    const platformFeeCents = Number(searchParams.get("platformFeeCents") || 0);
    const returnTo = searchParams.get("returnTo") || null;

    return {
      productId,
      title,
      priceCents,
      sellerName,
      sellerId,
      teacherPayoutCents,
      platformFeeCents,
      returnTo,
    };
  }, [searchParams]);
  const cancelLabel = getCheckoutReturnLabel(details.returnTo);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(
      CHECKOUT_CONFIRMATION_REMINDER_STORAGE_KEY,
    );
    setShouldShowReminder(storedPreference !== "hidden");
  }, []);

  return (
    <div className="w-full max-w-2xl rounded-[2rem] border border-ink/5 bg-white p-8 shadow-soft-xl">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-brand-soft p-2 text-brand">
          <CreditCard className="h-5 w-5" />
        </div>
        <SectionIntro
          body="This is the final review step before the purchase is submitted. Use it to make sure the product, seller, and price all look right before you continue."
          bodyClassName="text-base"
          eyebrow="Purchase check"
          level="h1"
          title="Make sure everything looks right before you confirm"
          titleClassName="text-3xl sm:text-4xl"
        />
      </div>
      {normalizedPurchaseError ? (
        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          Purchase preview error: {normalizedPurchaseError}
        </div>
      ) : null}

      <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-sm leading-6 text-ink-soft">
        <p className="font-semibold text-ink">Quick check</p>
        <p className="mt-1">
          Make sure the listing title, seller, and total match what you expected, then confirm or go back.
        </p>
      </div>

      <div className="mt-8 rounded-[1.5rem] bg-surface-subtle p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-ink-muted">
          Resource
        </p>
        <p className="mt-2 text-2xl font-semibold text-ink">{details.title}</p>
        <p className="mt-2 text-sm text-ink-soft">Sold by {details.sellerName}</p>
        <p className="mt-2 text-sm text-ink-soft">
          Purchasing as {viewer.name} ({viewer.email})
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-ink/5 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink-muted">
            Buyer pays
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {formatCurrency(details.priceCents)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-ink/5 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink-muted">
            Teacher earns
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {formatCurrency(details.teacherPayoutCents)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-ink/5 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-ink-muted">
            LessonForge keeps
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {formatCurrency(details.platformFeeCents)}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-ink-soft">
        Confirming sends this listing into your purchases flow. Going back returns you to the page that led you here.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form
          action="/api/lessonforge/purchase-complete"
          method="POST"
          ref={formRef}
        >
          <input name="productId" type="hidden" value={details.productId} />
          <input name="productTitle" type="hidden" value={details.title} />
          <input name="title" type="hidden" value={details.title} />
          <input name="sellerName" type="hidden" value={details.sellerName} />
          <input name="sellerId" type="hidden" value={details.sellerId} />
          <input name="amountCents" type="hidden" value={String(details.priceCents)} />
          <input name="priceCents" type="hidden" value={String(details.priceCents)} />
          <input
            name="teacherPayoutCents"
            type="hidden"
            value={String(details.teacherPayoutCents)}
          />
          <input
            name="platformFeeCents"
            type="hidden"
            value={String(details.platformFeeCents)}
          />
          {details.returnTo ? (
            <input name="returnTo" type="hidden" value={details.returnTo} />
          ) : null}
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            onClick={(event) => {
              if (!shouldShowReminder) {
                return;
              }

              event.preventDefault();
              setShowConfirmationReminder(true);
            }}
            type="submit"
          >
            <Receipt className="h-4 w-4" />
            Confirm purchase
          </button>
        </form>
        <Link
          className={secondaryActionLinkClassName("px-5 py-3")}
          data-testid="checkout-cancel-link"
          href={details.returnTo ?? "/?checkout=cancelled"}
        >
          <ArrowLeft className="h-4 w-4" />
          {cancelLabel}
        </Link>
      </div>

      <div className="mt-4 text-xs leading-6 text-ink-muted">
        You can turn off the final reminder if you do not want to see that window each time.
      </div>

      {showConfirmationReminder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5">
          <div className="w-full max-w-md rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-amber-50 p-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
                    Final check
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">
                    Make sure this purchase looks correct
                  </h2>
                </div>
              </div>
              <button
                className="rounded-full p-2 text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                onClick={() => setShowConfirmationReminder(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.25rem] bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
                <p className="font-semibold text-ink">{details.title}</p>
                <p className="mt-1">Sold by {details.sellerName}</p>
                <p className="mt-1">Total: {formatCurrency(details.priceCents)}</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Continue only if the product title, seller name, and total all match what you expected.
                </span>
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-black/5 bg-white px-4 py-3 text-sm text-ink-soft">
              <input
                checked={skipReminderNextTime}
                className="mt-1 h-4 w-4 rounded border-ink/20 text-brand focus:ring-brand"
                onChange={(event) => setSkipReminderNextTime(event.target.checked)}
                type="checkbox"
              />
              <span>Do not show this reminder again</span>
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                onClick={() => {
                  if (skipReminderNextTime) {
                    window.localStorage.setItem(
                      CHECKOUT_CONFIRMATION_REMINDER_STORAGE_KEY,
                      "hidden",
                    );
                    setShouldShowReminder(false);
                  }

                  setShowConfirmationReminder(false);
                  formRef.current?.requestSubmit();
                }}
                type="button"
              >
                Yes, continue purchase
              </button>
              <button
                className={secondaryActionLinkClassName("justify-center px-5 py-3")}
                onClick={() => setShowConfirmationReminder(false)}
                type="button"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

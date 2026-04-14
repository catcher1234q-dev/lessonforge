"use client";

import { useEffect, useRef, useState } from "react";

import { StartHerePanel } from "@/components/shared/start-here-panel";
import {
  getProductAssetHealthStatus,
  getProductPublishBlockers,
} from "@/lib/lessonforge/product-validation";
import type { ProductRecord, RefundRequestRecord, ReportRecord } from "@/types";

export function AdminDashboardClient({
  initialProducts,
  initialReports,
  initialRefundRequests,
}: {
  initialProducts: ProductRecord[];
  initialReports: ReportRecord[];
  initialRefundRequests: RefundRequestRecord[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [productNotes, setProductNotes] = useState<Record<string, string>>({});
  const productNotesRef = useRef<Record<string, string>>({});
  const [reports, setReports] = useState(initialReports);
  const [refundRequests, setRefundRequests] = useState(initialRefundRequests);
  const [refundNotes, setRefundNotes] = useState<Record<string, string>>({});
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  function getStatusMeaning(productStatus: NonNullable<ProductRecord["productStatus"]>) {
    switch (productStatus) {
      case "Published":
        return "Visible to buyers in marketplace, storefront, and checkout flows.";
      case "Pending review":
        return "Waiting for moderation review before buyers should see it.";
      case "Flagged":
        return "Sent back to the seller with a fix request before it can return to review.";
      case "Rejected":
        return "Needs a stronger seller revision before it should move forward again.";
      case "Removed":
        return "Taken out of circulation and not expected to return for buyers right away.";
      default:
        return "Still private to the seller while the listing is being built.";
    }
  }

  useEffect(() => {
    setIsDashboardReady(true);
  }, []);

  async function handleStatusChange(
    productId: string,
    productStatus: NonNullable<ProductRecord["productStatus"]>,
  ) {
    setMessage(null);
    const moderationFeedback =
      productNotesRef.current[productId] ??
      products.find((product) => product.id === productId)?.moderationFeedback ??
      "";

    const response = await fetch("/api/lessonforge/products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        productStatus,
        moderationFeedback,
      }),
    });

    const payload = (await response.json()) as {
      product?: ProductRecord;
      error?: string;
    };

    if (!response.ok || !payload.product) {
      setMessage(payload.error || "Unable to update product status.");
      return;
    }

    setProducts((current) =>
      current.map((product) =>
        product.id === payload.product?.id ? payload.product : product,
      ),
    );
    setMessage(`${payload.product.title} moved to ${payload.product.productStatus}.`);
  }

  async function handleRefundStatusChange(
    refundRequestId: string,
    status: NonNullable<RefundRequestRecord["status"]>,
  ) {
    setMessage(null);

    const response = await fetch("/api/lessonforge/refund-requests", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refundRequestId,
        status,
        adminResolutionNote: refundNotes[refundRequestId] || "",
      }),
    });

    const payload = (await response.json()) as {
      refundRequest?: RefundRequestRecord;
      error?: string;
    };

    if (!response.ok || !payload.refundRequest) {
      setMessage(payload.error || "Unable to update refund status.");
      return;
    }

    setRefundRequests((current) =>
      current.map((refund) =>
        refund.id === payload.refundRequest?.id ? payload.refundRequest : refund,
      ),
    );
    setMessage(
      `${payload.refundRequest.productTitle} refund marked ${payload.refundRequest.status.toLowerCase()}.`,
    );
  }

  async function handleReportStatusChange(
    reportId: string,
    status: NonNullable<ReportRecord["status"]>,
  ) {
    setMessage(null);

    const response = await fetch("/api/lessonforge/reports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportId,
        status,
        adminResolutionNote: reportNotes[reportId] || "",
      }),
    });

    const payload = (await response.json()) as {
      report?: ReportRecord;
      error?: string;
    };

    if (!response.ok || !payload.report) {
      setMessage(payload.error || "Unable to update report status.");
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === payload.report?.id ? payload.report : report,
      ),
    );
    setMessage(
      `${payload.report.productTitle} report marked ${payload.report.status.toLowerCase()}.`,
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        {isDashboardReady ? (
          <p className="sr-only" data-testid="admin-dashboard-ready">
            Admin dashboard ready
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold text-ink">Moderation queue</h2>
        <StartHerePanel
          className="border-rose-100 bg-rose-50/80"
          items={[
            {
              label: "Start here",
              detail: "Read the listing title, current status, and asset health before changing anything.",
            },
            {
              label: "Review next",
              detail: "Use the seller note to explain the next fix in plain language before sending a listing back.",
            },
            {
              label: "Then act",
              detail: "Only publish when preview, thumbnail, rights, and trust details look ready for a buyer.",
            },
          ]}
          title="Use this queue to decide whether a listing is ready for buyers, needs seller fixes, or should stay out of circulation."
        />
        <div className="mt-6 space-y-4">
          {products.length ? (
            products.map((product) => (
              <article
                key={product.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                data-testid={`admin-product-${product.id}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{product.title}</h3>
                    <p className="mt-2 text-sm text-ink-soft">
                      {product.subject} · {product.productStatus || "Draft"} ·{" "}
                      {product.createdPath || "Manual upload"}
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    Start with current status
                  </div>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-white/70 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">What this status means</p>
                  <p className="mt-1">{getStatusMeaning(product.productStatus || "Draft")}</p>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Choose the next moderation result</p>
                  <p className="mt-1">
                    Draft keeps the listing private. Pending review keeps it in admin review.
                    Flagged or Rejected sends it back to the seller with guidance. Published makes it buyer-visible.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      "Draft",
                      "Pending review",
                      "Published",
                      "Flagged",
                      "Rejected",
                      "Removed",
                    ] as const
                  ).map((status) => (
                    <button
                      key={status}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        product.productStatus === status
                          ? "bg-brand text-white"
                          : "bg-white text-ink-soft"
                      }`}
                      data-testid={`admin-product-status-${product.id}-${status.toLowerCase().replace(/\s+/g, "-")}`}
                      disabled={!isDashboardReady}
                      onClick={() => void handleStatusChange(product.id, status)}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Seller note</p>
                  <p className="mt-1">
                    Write the one next fix the seller should make. This note follows the listing back into the seller recovery flow.
                  </p>
                </div>
                <textarea
                  className="mt-4 min-h-24 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  data-testid={`admin-product-note-${product.id}`}
                  disabled={!isDashboardReady}
                  onChange={(event) =>
                    {
                      productNotesRef.current = {
                        ...productNotesRef.current,
                        [product.id]: event.target.value,
                      };
                      setProductNotes((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }));
                    }
                  }
                  placeholder="Add a seller-facing moderation note explaining what needs to change."
                  value={productNotes[product.id] ?? product.moderationFeedback ?? ""}
                />
                <p className="mt-4 text-sm leading-6 text-ink-soft">
                  {getStatusMeaning(product.productStatus || "Draft")}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Thumbnail
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      {product.thumbnailIncluded ? "Ready" : "Missing"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Preview
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      {product.previewIncluded ? "Ready" : "Missing"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                      Asset version
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      Version {product.assetVersionNumber ?? 1}
                    </p>
                  </div>
                </div>
                {product.thumbnailUrl ? (
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      alt={`${product.title} thumbnail`}
                      className="h-20 w-28 rounded-2xl border border-slate-200 object-cover"
                      src={product.thumbnailUrl}
                    />
                    <p className="text-sm leading-6 text-ink-soft">
                      Current moderation thumbnail view for this listing.
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-ink-soft">
                  <p className="font-semibold text-ink">Asset health</p>
                  <p className="mt-1">{getProductAssetHealthStatus(product)}</p>
                  {getProductPublishBlockers(product).length ? (
                    <div className="mt-2 space-y-1">
                      {getProductPublishBlockers(product).slice(0, 4).map((blocker) => (
                        <p key={blocker}>{blocker}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2">This listing has the core publish assets in place.</p>
                  )}
                </div>
                {product.moderationFeedback ? (
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    Seller note: {product.moderationFeedback}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink-soft">
              No persisted seller-created products yet. Create one from the seller
              flow to populate this moderation queue.
            </p>
          )}
        </div>
        {message ? (
          <p className="mt-5 text-sm text-ink-soft" data-testid="admin-dashboard-message">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-ink">Refund queue</h2>
        <div className="mt-4 rounded-[1.5rem] border border-sky-100 bg-sky-50/80 px-5 py-4 text-sm leading-7 text-ink-soft">
          <p className="font-semibold text-ink">How to use this queue</p>
          <p className="mt-1">
            Read the buyer reason first, add a short resolution note, then mark the request approved or denied so both sides understand the outcome.
          </p>
        </div>
        <div className="mt-6 space-y-4">
          {refundRequests.length ? (
            refundRequests.map((refund) => (
              <article
                key={refund.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-lg font-semibold text-ink">{refund.productTitle}</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Buyer: {refund.buyerName || "Buyer"} · Seller: {refund.sellerName} · Status: {refund.status}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{refund.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  Requested {new Date(refund.requestedAt).toLocaleDateString()}
                </p>
                <textarea
                  className="mt-4 min-h-24 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  onChange={(event) =>
                    setRefundNotes((current) => ({
                      ...current,
                      [refund.id]: event.target.value,
                    }))
                  }
                  placeholder="Add an admin resolution note for the buyer and seller."
                  value={refundNotes[refund.id] ?? refund.adminResolutionNote ?? ""}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["Submitted", "Approved", "Denied"] as const).map((status) => (
                    <button
                      key={status}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        refund.status === status
                          ? "bg-brand text-white"
                          : "bg-white text-ink-soft"
                      }`}
                      onClick={() => void handleRefundStatusChange(refund.id, status)}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {refund.adminResolutionNote ? (
                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    Admin note: {refund.adminResolutionNote}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink-soft">
              No refund requests yet. Buyers can submit them from the library.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-ink">Report queue</h2>
        <div className="mt-4 rounded-[1.5rem] border border-violet-100 bg-violet-50/70 px-5 py-4 text-sm leading-7 text-ink-soft">
          <p className="font-semibold text-ink">How to use this queue</p>
          <p className="mt-1">
            Start with the report details, summarize your triage note, then move the report into review, resolve it, or dismiss it.
          </p>
        </div>
        <div className="mt-6 space-y-4">
          {reports.length ? (
            reports.map((report) => (
              <article
                key={report.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-lg font-semibold text-ink">{report.productTitle}</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Reporter: {report.reporterName || "Buyer"} · Category: {report.category} · Status: {report.status}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{report.details}</p>
                <textarea
                  className="mt-4 min-h-24 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                  onChange={(event) =>
                    setReportNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                  placeholder="Add an admin note or triage summary for this report."
                  value={reportNotes[report.id] ?? report.adminResolutionNote ?? ""}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["Open", "Under review", "Resolved", "Dismissed"] as const).map((status) => (
                    <button
                      key={status}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        report.status === status
                          ? "bg-brand text-white"
                          : "bg-white text-ink-soft"
                      }`}
                      onClick={() => void handleReportStatusChange(report.id, status)}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-ink-soft">
              No product reports yet. Buyers can submit them from the library.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";

type BannerState = {
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone: "success" | "warning";
  message: string;
  title: string;
};

export function WebsiteStatusBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sellerName = params.get("seller_name");

    if (params.get("checkout") === "success") {
      const resourceId = params.get("resource");
      setBanner({
        ctaHref: "/library",
        ctaLabel: "Open your purchases",
        tone: "success",
        secondaryHref: resourceId ? `/marketplace/${resourceId}` : "/marketplace",
        secondaryLabel: "Back to marketplace",
        message:
          "Your purchase finished successfully. You can open it now from your purchases, or keep browsing the marketplace.",
        title: "Purchase complete",
      });
    } else if (params.get("checkout") === "cancelled") {
      const resourceId = params.get("resource");
      setBanner({
        ctaHref: resourceId ? `/marketplace/${resourceId}` : "/marketplace",
        ctaLabel: "Return to the product",
        tone: "warning",
        secondaryHref: "/marketplace",
        secondaryLabel: "Keep browsing",
        message: "Nothing was charged. You can return to the product to review it again, or keep browsing other resources.",
        title: "Purchase not completed",
      });
    } else if (params.get("seller_onboarding") === "refresh") {
      setBanner({
        ctaHref: "/sell/onboarding",
        ctaLabel: "Restart seller onboarding",
        tone: "warning",
        message:
          `${sellerName ?? "Seller"} onboarding needs to be restarted. Open the onboarding flow again to continue.`,
        title: "Seller setup needs one more step",
      });
    } else if (params.get("seller_onboarding") === "complete") {
      setBanner({
        ctaHref: "/sell/dashboard?setup=payouts-connected",
        ctaLabel: "Open seller dashboard",
        tone: "success",
        message: `${sellerName ?? "Seller"} returned from Stripe onboarding. If Stripe still needs more details, the listing will stay in preview until onboarding is fully completed.`,
        title: "Seller returned from onboarding",
      });
    }

    if (
      params.has("checkout") ||
      params.has("resource") ||
      params.has("seller_onboarding")
    ) {
      params.delete("checkout");
      params.delete("resource");
      params.delete("seller_onboarding");
      params.delete("seller_name");

      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  if (!banner) {
    return null;
  }

  const isSuccess = banner.tone === "success";

  return (
    <section className="px-5 pt-6 sm:px-6 lg:px-8">
      <div
        className={`mx-auto max-w-6xl rounded-[1.25rem] border px-4 py-3.5 shadow-soft-xl ${
          isSuccess
            ? "border-brand/10 bg-brand-soft text-brand-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5" />
            ) : (
              <CircleAlert className="mt-0.5 h-4.5 w-4.5" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                {banner.title}
              </p>
              <p className="mt-1 text-sm leading-5.5">{banner.message}</p>
            </div>
          </div>
          {(banner.ctaHref || banner.secondaryHref) ? (
            <div className="flex flex-wrap gap-2.5">
              {banner.ctaHref && banner.ctaLabel ? (
                <Link
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isSuccess
                      ? "bg-brand text-white hover:bg-brand-700"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
                  href={banner.ctaHref}
                >
                  {banner.ctaLabel}
                </Link>
              ) : null}
              {banner.secondaryHref && banner.secondaryLabel ? (
                <Link
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isSuccess
                      ? "border-brand/15 bg-white text-brand hover:border-brand/25"
                      : "border-amber-200 bg-white text-amber-800 hover:border-amber-300"
                  }`}
                  href={banner.secondaryHref}
                >
                  {banner.secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

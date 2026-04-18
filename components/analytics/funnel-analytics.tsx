"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackFunnelEvent, type AnalyticsProps } from "@/lib/analytics/events";

function parseAnalyticsProps(value: string | undefined): AnalyticsProps {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as AnalyticsProps)
      : {};
  } catch {
    return {};
  }
}

function getRouteViewEvent(pathname: string): { name: string; props?: AnalyticsProps } {
  if (pathname === "/") {
    return { name: "homepage_viewed" };
  }

  if (pathname === "/marketplace") {
    return { name: "marketplace_viewed" };
  }

  if (pathname.startsWith("/marketplace/")) {
    return {
      name: "product_viewed",
      props: { productSlug: pathname.replace("/marketplace/", "") },
    };
  }

  if (pathname === "/checkout/success") {
    return { name: "checkout_success_viewed" };
  }

  if (pathname === "/checkout/cancel") {
    return { name: "checkout_canceled" };
  }

  if (pathname === "/sell/onboarding") {
    return { name: "seller_onboarding_viewed" };
  }

  if (pathname === "/sell/dashboard") {
    return { name: "seller_dashboard_viewed" };
  }

  if (pathname === "/sell/products/new") {
    return { name: "seller_first_listing_started" };
  }

  if (pathname === "/library") {
    return { name: "library_viewed" };
  }

  if (pathname === "/favorites") {
    return { name: "favorites_viewed" };
  }

  return { name: "page_viewed", props: { path: pathname } };
}

export function FunnelAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const searchString = window.location.search;
    const routeView = getRouteViewEvent(pathname);
    trackFunnelEvent(routeView.name, {
      ...routeView.props,
      hasQuery: searchString.length > 0,
    });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest<HTMLElement>("[data-analytics-event]");

      if (!element) {
        return;
      }

      trackFunnelEvent(element.dataset.analyticsEvent ?? "interaction_clicked", {
        ...parseAnalyticsProps(element.dataset.analyticsProps),
        label: element.dataset.analyticsLabel ?? element.textContent?.trim().slice(0, 80),
      });
    }

    function handleSubmit(event: SubmitEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;

      if (!target?.dataset.analyticsEvent) {
        return;
      }

      trackFunnelEvent(target.dataset.analyticsEvent, parseAnalyticsProps(target.dataset.analyticsProps));
    }

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("submit", handleSubmit, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, []);

  return null;
}

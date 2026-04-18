"use client";

import { track } from "@vercel/analytics";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (name: string, options?: { props?: AnalyticsProps }) => void;
    posthog?: {
      capture?: (name: string, props?: AnalyticsProps) => void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}

function cleanProps(props?: AnalyticsProps): AnalyticsProps {
  if (!props) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}

export function trackFunnelEvent(name: string, props?: AnalyticsProps) {
  if (typeof window === "undefined") {
    return;
  }

  const safeProps = cleanProps(props);

  track(name, safeProps);
  window.plausible?.(name, { props: safeProps });
  window.posthog?.capture?.(name, safeProps);
  window.gtag?.("event", name, safeProps);

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", name, safeProps);
  }
}

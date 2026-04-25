import { Suspense } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { FunnelAnalytics } from "@/components/analytics/funnel-analytics";
import { AuthCodeBridge } from "@/components/layout/auth-code-bridge";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { siteConfig } from "@/lib/config/site";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.productName,
    template: `%s | ${siteConfig.productName}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.productionUrl),
  alternates: {
    canonical: "/",
  },
  applicationName: siteConfig.productName,
  category: "education",
  keywords: [
    "teacher marketplace",
    "classroom resources",
    "lesson resources",
    "K-12 resources",
    "teacher sellers",
  ],
  openGraph: {
    title: siteConfig.productName,
    description: siteConfig.description,
    url: siteConfig.productionUrl,
    siteName: siteConfig.productName,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${siteConfig.productName} teacher marketplace preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.productName,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-surface-subtle font-[family-name:var(--font-sans)] text-ink antialiased">
        <Analytics />
        <FunnelAnalytics />
        <Suspense fallback={null}>
          <AuthCodeBridge />
        </Suspense>
        <MaintenanceGate>{children}</MaintenanceGate>
      </body>
    </html>
  );
}

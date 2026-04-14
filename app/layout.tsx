import type { Metadata } from "next";

import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { siteConfig } from "@/lib/config/site";

import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.productName,
  description: siteConfig.description,
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
        <MaintenanceGate>{children}</MaintenanceGate>
      </body>
    </html>
  );
}

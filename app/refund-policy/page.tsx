import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: `Refund Policy | ${siteConfig.productName}`,
  description: `How ${siteConfig.productName} handles buyer refund requests and issue reporting.`,
};

const sections = [
  {
    title: "When a buyer should request a refund",
    body: [
      "A refund request is most appropriate when a purchased file is broken, key access is missing, the listing is clearly misleading, or the delivered product is materially different from what the listing promised.",
      "The fastest first step is usually to reopen the purchased listing, redownload the files, and use the library support tools before treating the problem as a refund case.",
    ],
  },
  {
    title: "How requests are reviewed",
    body: [
      "Refund requests may be reviewed by LessonForge admins and, when needed, escalated to the owner side for final marketplace decisions.",
      "Review may consider the listing details, the buyer report, seller response, file-access history, and whether the issue appears to be a broken file, access issue, copyright problem, or a misleading listing.",
    ],
  },
  {
    title: "What happens after a request",
    body: [
      "Buyers should be able to see when a refund request has been submitted, approved, or denied. Open requests may stay visible in the buyer account area until a final decision is made.",
      "If a refund is approved, payment reversal timing may depend on the payment provider and the original payment method.",
    ],
  },
  {
    title: "When a refund may be denied",
    body: [
      "Refunds may be denied when the product matches the listing, access is available, the issue falls outside the listing promise, or the buyer is attempting to keep or redistribute paid content after using it outside the license terms.",
      "LessonForge may also deny requests that appear abusive, duplicative, or inconsistent with the marketplace record.",
    ],
  },
  {
    title: "Seller and marketplace protections",
    body: [
      "Refunds are part of marketplace trust, but they should also be reviewed carefully to avoid unfair seller losses. Repeated reports, repeated refunds, or broken-file issues may also affect listing review and marketplace ranking.",
      "LessonForge may update this policy as moderation and payment systems move from MVP into full production launch.",
    ],
  },
] as const;

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Refunds"
      intro="This page explains the current plain-language refund expectations for LessonForge buyers, sellers, and marketplace reviewers."
      sections={[...sections]}
      title="Refund Policy"
      updatedLabel="Last updated: April 8, 2026"
    />
  );
}

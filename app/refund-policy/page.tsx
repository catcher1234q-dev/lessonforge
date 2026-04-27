import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Refund Policy",
  description:
    "How LessonForgeHub handles buyer refund requests, access issues, broken files, misleading listings, and seller protections.",
  path: "/refund-policy",
});

const sections = [
  {
    title: "Digital purchases are usually final",
    body: [
      "LessonForgeHub is operated by LessonForge LLC, a registered U.S. business.",
      "All products sold on LessonForgeHub are digital downloads. No physical items are shipped.",
      "All purchases provide access to downloadable digital resources.",
      "All products are delivered digitally. After purchase, users receive immediate access through their account and/or a download link.",
      "Products are digital and delivered instantly.",
      "Due to the nature of digital products, all sales are final once access has been granted.",
      "Once a buyer receives access to a digital resource, the sale is generally final unless there is a real delivery, access, listing, or rights problem.",
      "This protects buyers from broken or misleading purchases while also protecting sellers from refund requests after a usable file has already been delivered.",
    ],
  },
  {
    title: "When a refund may be approved",
    body: [
      "A refund may be approved when there is a duplicate purchase, a corrupted or inaccessible file, or a product that is significantly not as described.",
      "A refund may also be approved when the purchased file is missing, broken, corrupted, or cannot be opened; the buyer cannot access the product after purchase; the listing is materially misleading; the delivered resource is materially different from what was described; or a copyright, ownership, or rights concern requires review.",
      "LessonForgeHub may also review other clear delivery failures caused by the site, payment record, or listing.",
    ],
  },
  {
    title: "When a refund may be denied",
    body: [
      "A refund may be denied when the buyer changed their mind, made a purchase by mistake, bought the wrong item, did not read the listing, preview, or description, the product matches the listing, access works, or the issue is mainly a preference issue.",
      "Refunds may also be denied when a buyer has used, copied, shared, redistributed, or attempted to keep paid content outside the license terms.",
    ],
  },
  {
    title: "How to request help",
    body: [
      "The fastest first step is to open the buyer library, redownload the file, revisit the listing, and use the support or refund tools attached to the purchase.",
      "A strong request should include the order, product title, what went wrong, and any screenshots or details that help LessonForgeHub review the issue fairly.",
      "Refund requests must be submitted to support@lessonforgehub.com.",
      "If you need help before filing a refund request, contact support@lessonforgehub.com and expect a response within 24–48 hours.",
    ],
  },
  {
    title: "How requests are reviewed",
    body: [
      "Refund requests are reviewed by LessonForgeHub and may require seller input before a decision is made.",
      "Refund requests may be reviewed by LessonForge admins and, when needed, escalated to the owner side for final marketplace decisions.",
      "LessonForgeHub has final review authority on refund decisions made inside the marketplace.",
      "Review may consider the listing details, the buyer report, seller response, file-access history, and whether the issue appears to be a broken file, access issue, copyright problem, or a misleading listing.",
    ],
  },
  {
    title: "What happens after a request",
    body: [
      "Buyers should be able to see when a refund request has been submitted, approved, or denied. Open requests may stay visible in the buyer account area until a final decision is made.",
      "If a refund is approved, payment reversal timing may depend on the payment provider, the card network, and the original payment method. Refunded purchases may lose access to protected downloads.",
    ],
  },
  {
    title: "Chargebacks and payment disputes",
    body: [
      "If you experience an issue with a purchase, please contact support before filing a payment dispute. We will review and respond within 24–48 hours.",
      "We aim to resolve all issues quickly to avoid the need for external disputes.",
      "Buyers should contact support@lessonforgehub.com before filing a chargeback whenever a purchase issue can be reviewed inside LessonForgeHub.",
      "If a buyer opens a payment dispute or chargeback with their card provider, LessonForgeHub may use order records, download records, listing details, support messages, and refund history to respond.",
      "Repeated chargebacks or disputes without contacting support first may lead to account review or restrictions.",
      "Threatening reviews, pressure, or other abuse to force a refund is not allowed. Accounts may be limited when disputes, fraud signals, or repeated refund abuse put buyers, sellers, or the marketplace at risk.",
    ],
  },
  {
    title: "Seller and marketplace protections",
    body: [
      "Refunds are part of marketplace trust, but they should be reviewed carefully to avoid unfair seller losses. Sellers are responsible for accurate listings, working files, rights-to-sell confirmation, and classroom-appropriate materials.",
      "Refunds, chargebacks, repeated reports, rights problems, or broken-file issues may affect seller payouts, listing review, marketplace ranking, and account standing.",
      "LessonForgeHub may hold, reverse, or adjust seller earnings when a refund, chargeback, fraud review, or rights issue affects a sale.",
    ],
  },
  {
    title: "Policy changes",
    body: [
      "LessonForgeHub may update this refund policy as the marketplace, payment systems, and support process mature. The version posted here should be treated as the current public policy.",
    ],
  },
] as const;

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Refunds"
      intro="This page explains when digital resource purchases are usually final, when refunds may be reviewed, and how LessonForgeHub protects both buyers and sellers."
      sections={[...sections]}
      title="Refund Policy"
      updatedLabel="Last updated: April 17, 2026"
    />
  );
}

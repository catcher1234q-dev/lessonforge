import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How LessonForgeHub handles account information, marketplace activity, payments, seller data, and support records.",
  path: "/privacy",
});

const sections = [
  {
    title: "What we collect",
    body: [
      "LessonForgeHub collects the information needed to run a teacher marketplace, including account details, seller profile information, listing content, order history, support requests, and moderation records connected to listings and purchases.",
      "LessonForgeHub sells digital products only. No physical items are shipped.",
      "All purchases provide access to downloadable digital resources.",
      "When payments are active, the payment provider handles sensitive payment details. LessonForgeHub stores the order, seller, payout, and access records needed to support the sale.",
      "LessonForgeHub does not store full payment card numbers, card security codes, or other full card details on its own servers.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "We use your information to let you sign in, publish listings, complete purchases, open purchased files, review products, request refunds, and manage moderation or support follow-up.",
      "We may also use marketplace activity data to improve search, spot abuse, and explain seller performance, but we do not present payment-card details directly inside LessonForge.",
    ],
  },
  {
    title: "Who sees what",
    body: [
      "Buyers can see public listing and seller storefront information. Sellers can see their own listing, sales, and payout information. Admin and owner access is limited to moderation, operations, and founder-level oversight.",
      "Private buyer, seller, admin, and owner areas should only be available to signed-in sessions with the correct permissions.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "LessonForgeHub may rely on services like Supabase for sign-in, a payment provider for payments and payouts, and cloud hosting providers for website delivery.",
      "Those providers have their own policies, and using LessonForge may require sharing only the information needed for those services to perform their part of the product.",
    ],
  },
  {
    title: "Contact and updates",
    body: [
      "If this policy changes in a meaningful way, the updated version should be posted here before the new behavior is treated as the live rule.",
      "For privacy questions, contact support@lessonforgehub.com. We respond to support inquiries within 24–48 hours.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      intro="This page explains the plain-language privacy expectations for LessonForgeHub as a marketplace for teacher-created digital resources."
      sections={[...sections]}
      title="Privacy Policy"
      updatedLabel="Last updated: April 8, 2026"
    />
  );
}

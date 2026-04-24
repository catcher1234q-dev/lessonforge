import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Copyright Policy",
  description:
    "How LessonForgeHub handles copyright concerns, seller originality rules, and infringement reports.",
  path: "/copyright-policy",
});

const sections = [
  {
    title: "Marketplace ownership rules",
    body: [
      "LessonForgeHub is operated by LessonForge LLC, a registered U.S. business.",
      "Sellers may only upload resources they created or have legal rights to sell.",
      "Sellers may not upload copied, stolen, infringing, resold, or unauthorized marketplace content.",
    ],
  },
  {
    title: "How to report a rights concern",
    body: [
      "Copyright owners can report suspected infringement to support@lessonforgehub.com.",
      "Reports should include the product link, proof of ownership, and a description of the concern so LessonForgeHub can review it responsibly.",
    ],
  },
  {
    title: "How LessonForgeHub reviews reports",
    body: [
      "LessonForgeHub may remove listings, restrict sellers, and hold payouts while reviewing rights concerns.",
      "The marketplace may also request more information from the seller or reporter when a listing needs additional ownership review.",
    ],
  },
] as const;

export default function CopyrightPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Copyright"
      intro="This page explains the basic ownership rules for marketplace listings and how to report suspected infringement."
      sections={[...sections]}
      title="Copyright Policy"
      updatedLabel="Last updated: April 24, 2026"
    />
  );
}

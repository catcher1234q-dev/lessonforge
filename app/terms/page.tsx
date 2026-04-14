import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: `Terms of Use | ${siteConfig.productName}`,
  description: `Plain-language marketplace terms for buyers, sellers, and admins using ${siteConfig.productName}.`,
};

const sections = [
  {
    title: "Using LessonForge",
    body: [
      "LessonForge is a marketplace for K-12 teaching resources. By using the site, you agree to use it for lawful classroom, publishing, and purchasing activity.",
      "You should not use LessonForge to upload content you do not own, attempt to bypass access controls, misuse private admin or owner areas, or interfere with the website.",
    ],
  },
  {
    title: "Seller responsibilities",
    body: [
      "Sellers are responsible for making sure they own or have rights to sell what they publish. Listings should be accurate, classroom-appropriate, and include the preview and thumbnail requirements needed for publication.",
      "LessonForge may review, flag, remove, or hold listings that appear misleading, broken, unsafe, copied without rights, or otherwise unfit for the marketplace.",
    ],
  },
  {
    title: "Buyer responsibilities",
    body: [
      "Buyers may use purchased resources according to the license attached to that product. Buyers should not resell, repost, or share purchased files in ways that break the listing license.",
      "Verified buyers may be allowed to leave reviews, request refunds, or report issues when something is broken or misrepresented.",
    ],
  },
  {
    title: "Payments and access",
    body: [
      "When live payments are enabled, Stripe processes checkout and seller payouts. LessonForge records order, access, and earnings information needed to support the sale.",
      "Marketplace access, downloads, preview behavior, and payout timing may depend on product status, seller setup, fraud checks, and moderation decisions.",
    ],
  },
  {
    title: "Changes and account decisions",
    body: [
      "LessonForge may update the product, pricing, policies, seller plan features, moderation rules, or AI controls as the marketplace matures.",
      "Accounts, listings, or marketplace access may be restricted when required to protect buyers, sellers, the platform, or payment integrity.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      intro="These terms are written in plain language to explain the basic rules for buyers, sellers, admins, and the founder side of LessonForge."
      sections={[...sections]}
      title="Terms of Use"
      updatedLabel="Last updated: April 8, 2026"
    />
  );
}

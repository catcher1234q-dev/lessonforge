import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "Plain-language LessonForgeHub terms for a digital teacher marketplace, including listings, payments, content rules, removals, and digital access.",
  path: "/terms",
});

const sections = [
  {
    title: "Using LessonForge",
    body: [
      "LessonForgeHub is operated by LessonForge LLC, a registered U.S. business.",
      "LessonForge LLC is located at 2730 Dale St. North, Roseville, MN 55113.",
      "LessonForgeHub is a digital marketplace for teacher-created classroom resources. Buyers use the platform to purchase digital downloads, and sellers use the platform to upload and sell original teaching materials.",
      "LessonForgeHub is not the seller of record for individual products. Products are sold by independent sellers on the marketplace.",
      "By using the site, you agree to use it for lawful classroom, publishing, and purchasing activity. You should not upload content you do not own, attempt to bypass access controls, misuse private admin or owner areas, or interfere with the website.",
    ],
  },
  {
    title: "Seller responsibilities",
    body: [
      "Users must be at least 18 years old to open a seller account and sell on LessonForgeHub.",
      "Sellers are responsible for making sure they own or have rights to sell what they publish. Listings should be accurate, classroom-appropriate, and include the preview and thumbnail requirements needed for publication.",
      "LessonForgeHub may review, flag, remove, or hold listings that appear misleading, broken, unsafe, copied without rights, or otherwise unfit for the marketplace.",
      "Sellers are responsible for the quality, accuracy, file access, license terms, copyright compliance, and rights-to-sell confirmation for their resources.",
      "Sellers are also responsible for taxes, reporting, and other legal obligations tied to their marketplace earnings.",
    ],
  },
  {
    title: "Buyer responsibilities",
    body: [
      "Buyers may use purchased resources according to the license attached to that product. Buyers should not resell, repost, or share purchased files in ways that break the listing license.",
      "Verified buyers may be allowed to leave reviews, request refunds, or report issues when something is broken or misrepresented.",
      "Buyers should contact support before filing payment disputes when a purchase issue can be reviewed inside LessonForgeHub.",
    ],
  },
  {
    title: "Digital purchases and access",
    body: [
      "LessonForgeHub sells digital classroom resources. Once a buyer receives access to a purchased resource, the sale is generally final unless the refund policy applies.",
      "Purchased access may depend on verified payment status, product status, fraud checks, refund status, and moderation decisions.",
      "Buyers should not resell, repost, publicly share, or redistribute purchased files unless the product license clearly allows it.",
    ],
  },
  {
    title: "Payments, payouts, and disputes",
    body: [
      "Payments are processed through a third-party payment provider. LessonForgeHub records the order, access, fee, plan, and seller payout information needed to support each sale.",
      "LessonForgeHub facilitates payment processing between buyers and sellers. Funds are collected and distributed through third-party payment providers in accordance with platform policies.",
      "Customers should be able to find the refund policy, support contact, and seller content rules before or after a purchase.",
      "Seller payouts may be delayed, adjusted, held, reversed, or reduced when a sale is refunded, disputed, charged back, suspected of fraud, or tied to a rights or file-access problem.",
      "LessonForgeHub may use order records, access records, listing details, support messages, and refund history to review payment disputes and protect the marketplace.",
    ],
  },
  {
    title: "Changes and account decisions",
    body: [
      "LessonForgeHub may update the product, pricing, policies, seller plan features, moderation rules, or AI controls as the marketplace matures.",
      "Accounts, listings, downloads, seller payouts, or marketplace access may be restricted when required to protect buyers, sellers, the business, or payment integrity.",
    ],
  },
  {
    title: "Business protection rules",
    body: [
      "LessonForgeHub may block or limit activity that creates unusual refund risk, chargeback risk, rights risk, fraud risk, excessive support burden, or misuse of protected downloads.",
      "Threatening reviews, pressure, harassment, or other abuse to force a refund, payout decision, or policy exception is not allowed.",
      "The marketplace may also remove listings, pause seller access, or require fixes when product quality, file delivery, licensing, or buyer trust is at risk.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      intro="These terms explain the basic rules for buying, selling, digital access, payments, refunds, and marketplace safety on LessonForgeHub."
      sections={[...sections]}
      title="Terms of Service"
      updatedLabel="Last updated: April 17, 2026"
    />
  );
}

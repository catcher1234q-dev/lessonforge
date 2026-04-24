import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller Policy",
  description:
    "Plain-language seller policy for LessonForgeHub covering ownership, prohibited content, misleading listings, payouts, and policy enforcement.",
  path: "/seller-agreement",
});

const sections = [
  {
    title: "Marketplace relationship",
    body: [
      "LessonForgeHub is a marketplace platform for teacher-created digital classroom resources. Sellers are independent and are responsible for the materials, descriptions, and rights tied to their own listings.",
      "LessonForgeHub is not the author of seller content. The platform processes marketplace transactions, keeps a commission on each completed sale, and uses third-party payment providers to route buyer payments and seller payouts.",
    ],
  },
  {
    title: "Ownership and originality",
    body: [
      "Sellers must only upload resources they created themselves or have clear rights to sell. Uploading copied, unlicensed, or infringing material is not allowed.",
      "By listing a product, the seller confirms that the material is original or properly licensed and that LessonForgeHub may review the listing for rights, quality, and policy compliance.",
    ],
  },
  {
    title: "Prohibited content",
    body: [
      "Sellers may not publish content that is infringing, deceptive, broken, unsafe, hateful, sexually explicit, or otherwise unfit for a K-12 teacher marketplace.",
      "Copyrighted, stolen, unlicensed, or unauthorized resale content is prohibited. Listings may also be removed when they are clearly misleading, unusable after download, spammy, or repeatedly reported for legitimate policy issues.",
    ],
  },
  {
    title: "Listing and compliance rules",
    body: [
      "Sellers are responsible for accurate titles, descriptions, grade levels, standards tags, preview quality, and rights-to-sell confirmation.",
      "Misleading listings, copied marketplace content, inaccurate previews, and file-delivery problems are not allowed. LessonForgeHub may hold, unpublish, flag, remove listings, suspend sellers, or hold payouts when policy enforcement, moderation review, refund protection, or payment integrity requires it.",
    ],
  },
  {
    title: "Payout terms",
    body: [
      "Seller earnings depend on the seller plan and the marketplace commission in effect at the time of sale. Depending on the payout provider setup, provider fees or payout processing adjustments may also affect what is available for payout.",
      "Transactions and payouts are processed through third-party providers. Refunds, chargebacks, or policy violations may reduce, delay, hold, or reverse seller earnings tied to a transaction.",
    ],
  },
  {
    title: "Taxes and business responsibility",
    body: [
      "Sellers are responsible for their own tax reporting, business records, and compliance with local laws related to selling digital products.",
      "LessonForgeHub can share payout and transaction information needed for seller account records, support follow-up, and payment-provider review.",
    ],
  },
] as const;

export default function SellerAgreementPage() {
  return (
    <LegalPageShell
      eyebrow="Seller rules"
      intro="This policy explains the basic expectations for teacher sellers who upload and sell classroom resources through LessonForgeHub."
      sections={[...sections]}
      title="Seller Policy"
      updatedLabel="Last updated: April 19, 2026"
    />
  );
}

import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Payout Policy",
  description:
    "Plain-language payout timing and eligibility rules for LessonForgeHub sellers.",
  path: "/payout-policy",
});

const sections = [
  {
    title: "How payouts work",
    body: [
      "LessonForgeHub is operated by LessonForge LLC, a registered U.S. business.",
      "Transactions are processed by third-party payment providers. Sellers must complete the required connected payout account onboarding before payouts can be sent.",
      "LessonForgeHub facilitates payment processing between buyers and sellers. Funds are collected and distributed through third-party payment providers in accordance with platform policies.",
      "Seller earnings are based on the sale price minus the LessonForgeHub commission and any provider fees or payment adjustments that apply to that transaction.",
      "Standard seller payouts are released after the payment provider confirms the transaction and any required marketplace review is complete. Payouts may be delayed for refunds, disputes, fraud review, rights concerns, incomplete seller onboarding, payment provider review, or policy violations.",
    ],
  },
  {
    title: "When payouts may be delayed or reduced",
    body: [
      "Payouts may be delayed, reduced, or held when a transaction is refunded, disputed, charged back, flagged for fraud review, or tied to a broken file, rights problem, or policy violation.",
      "LessonForgeHub may also delay payouts when seller onboarding is incomplete, account information is missing, or payment-provider review requires more information.",
    ],
  },
  {
    title: "Seller eligibility",
    body: [
      "To remain payout eligible, sellers should keep accurate store information, complete payout onboarding, maintain a valid connected payout account, and follow marketplace content rules.",
      "Repeated listing issues, rights claims, policy violations, or unresolved buyer problems may affect payout timing and account standing.",
    ],
  },
  {
    title: "How adjustments are handled",
    body: [
      "Refunds, duplicate charges, and payment disputes may create deductions against seller earnings related to the affected sale.",
      "If a transaction is reversed or blocked, the related seller payout may be adjusted even if the original sale already appeared successful.",
    ],
  },
  {
    title: "Timing and payout thresholds",
    body: [
      "Payout timing and any minimum payout threshold may vary based on the connected payout account, provider rules, transaction history, and marketplace risk review.",
      "If payout timing or thresholds are updated later, the current version posted on this page should be treated as the active public policy.",
    ],
  },
] as const;

export default function PayoutPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Payouts"
      intro="This page explains when sellers become payout eligible, how payout timing works, and why refunds or disputes can affect earnings."
      sections={[...sections]}
      title="Payout Policy"
      updatedLabel="Last updated: April 19, 2026"
    />
  );
}

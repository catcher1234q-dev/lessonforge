export type PrismaSellerFlowStep = {
  label: string;
  status: "ready" | "blocked";
  detail: string;
};

export type PrismaSellerFlowReport = {
  ok: boolean;
  mode: "prisma";
  sellerEmail: string;
  productId: string;
  summary: string;
  steps: PrismaSellerFlowStep[];
};

type BuildPrismaSellerFlowReportInput = {
  sellerEmail: string;
  productId: string;
  sellerProfileSaved: boolean;
  productSaved: boolean;
};

export function buildPrismaSellerFlowReport({
  sellerEmail,
  productId,
  sellerProfileSaved,
  productSaved,
}: BuildPrismaSellerFlowReportInput): PrismaSellerFlowReport {
  const steps: PrismaSellerFlowStep[] = [
    {
      label: "Seller profile saved and reloaded",
      status: sellerProfileSaved ? "ready" : "blocked",
      detail: sellerProfileSaved
        ? `Seller profile save and reload succeeded for ${sellerEmail}.`
        : `Seller profile save or reload failed for ${sellerEmail}.`,
    },
    {
      label: "Seller product saved and reloaded",
      status: productSaved ? "ready" : "blocked",
      detail: productSaved
        ? `Seller product save and reload succeeded for ${productId}.`
        : `Seller product save or reload failed for ${productId}.`,
    },
  ];

  const ok = steps.every((step) => step.status === "ready");

  return {
    ok,
    mode: "prisma",
    sellerEmail,
    productId,
    summary: ok
      ? "Prisma seller flow verification passed."
      : "Prisma seller flow verification failed.",
    steps,
  };
}

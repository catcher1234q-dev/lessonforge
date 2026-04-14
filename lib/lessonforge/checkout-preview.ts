export function buildCheckoutPreviewHref(input: {
  platformFeeCents: number;
  priceCents: number;
  productId: string;
  returnTo?: string;
  sellerId: string;
  sellerName: string;
  teacherPayoutCents: number;
  title: string;
}) {
  const params = new URLSearchParams({
    productId: input.productId,
    title: input.title,
    sellerName: input.sellerName,
    sellerId: input.sellerId,
    priceCents: String(input.priceCents),
    teacherPayoutCents: String(input.teacherPayoutCents),
    platformFeeCents: String(input.platformFeeCents),
  });

  if (input.returnTo) {
    params.set("returnTo", input.returnTo);
  }

  return `/checkout-preview?${params.toString()}`;
}

export function getCheckoutReturnLabel(returnTo: string | null) {
  if (!returnTo) {
    return "Cancel and go back";
  }

  if (returnTo.startsWith("/favorites")) {
    return "Cancel and return to shortlist";
  }

  if (returnTo.startsWith("/marketplace/")) {
    return "Cancel and return to product";
  }

  if (returnTo.startsWith("/store/")) {
    return "Cancel and return to storefront";
  }

  return "Cancel and go back";
}

export function getSafeReturnTo(
  candidate: string | null | undefined,
  fallback = "/marketplace",
) {
  if (!candidate || !candidate.startsWith("/")) {
    return fallback;
  }

  return candidate;
}

export function buildMarketplaceListingHref(input: {
  returnTo?: string;
  slug: string;
}) {
  const params = new URLSearchParams();

  if (input.returnTo) {
    params.set("returnTo", input.returnTo);
  }

  const queryString = params.toString();
  return queryString
    ? `/marketplace/${input.slug}?${queryString}`
    : `/marketplace/${input.slug}`;
}

export function getMarketplaceReturnLabel(returnTo: string) {
  if (returnTo.startsWith("/library")) {
    return "Back to library";
  }

  if (returnTo.startsWith("/favorites")) {
    return "Back to shortlist";
  }

  if (returnTo.startsWith("/store/")) {
    return "Back to storefront";
  }

  return "Back to marketplace";
}

export function getMarketplaceReturnActionLabel(returnTo: string) {
  if (returnTo.startsWith("/library")) {
    return "Return to library";
  }

  if (returnTo.startsWith("/favorites")) {
    return "Return to shortlist";
  }

  if (returnTo.startsWith("/store/")) {
    return "Return to storefront";
  }

  return "Browse all resources";
}

export function getStorefrontAction(input: {
  returnTo: string;
  sellerId: string;
  sellerName?: string;
}) {
  if ((input.sellerName ?? "").trim() === "LessonForge Marketplace") {
    return {
      href: "/marketplace",
      label: "Browse starter resources",
    };
  }

  const canonicalStorefront = `/store/${input.sellerId}`;
  const isCurrentStorefront = input.returnTo.startsWith(canonicalStorefront);

  return {
    href: isCurrentStorefront ? input.returnTo : canonicalStorefront,
    label: isCurrentStorefront ? "Return to storefront" : "Visit storefront",
  };
}

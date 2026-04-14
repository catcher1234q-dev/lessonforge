import Link from "next/link";

export function SearchEmptyState({
  query,
  subject,
  trustFilter,
  gradeBand,
  resourceType,
  priceFilter,
}: {
  query: string;
  subject: string;
  trustFilter: string;
  gradeBand: string;
  resourceType: string;
  priceFilter: string;
}) {
  const suggestions = [
    trustFilter !== "all"
      ? {
          label: "Drop trust filter",
          href: `/marketplace${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        }
      : null,
    subject !== "All"
      ? {
          label: `Try all subjects instead of ${subject}`,
          href: "/marketplace",
        }
      : null,
    priceFilter !== "all"
      ? {
          label: "Widen price range",
          href: "/marketplace",
        }
      : null,
    gradeBand !== "All"
      ? {
          label: "Remove grade filter",
          href: "/marketplace",
        }
      : null,
    resourceType !== "All"
      ? {
          label: "Try all resource types",
          href: "/marketplace",
        }
      : null,
    query
      ? {
          label: `Search more broadly than “${query}”`,
          href: "/marketplace",
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];
  const hasActiveFilters = Boolean(
    query || subject !== "All" || trustFilter !== "all" || gradeBand !== "All" || resourceType !== "All" || priceFilter !== "all",
  );

  return (
    <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
        Start here
      </span>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
        No exact matches yet
      </p>
      <h2 className="mt-4 text-3xl font-semibold text-ink">
        Nothing matches this search right now.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft">
        {hasActiveFilters
          ? "The fastest next step is widening the search so you can see more of the catalog before giving up on the browse."
          : "The catalog is still getting started. The fastest next step is opening all listings again or adding the first real listing."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          className="inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          data-testid="marketplace-empty-primary"
          href="/marketplace"
        >
          Browse all listings
        </Link>
        <Link
          className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
          data-testid="marketplace-empty-reset"
          href="/sell/products/new"
        >
          Add the first listing
        </Link>
      </div>
      {suggestions.length ? (
        <div className="mx-auto mt-6 max-w-3xl">
          <p className="text-sm font-semibold text-ink">Or try one of these:</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {suggestions.slice(0, 4).map((suggestion) => (
              <Link
                key={suggestion.label}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-200 hover:text-ink"
                data-testid={`marketplace-empty-${suggestion.label
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`}
                href={suggestion.href}
              >
                {suggestion.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

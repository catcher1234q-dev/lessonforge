import Link from "next/link";

export function SearchEmptyState({
  query,
  subject,
}: {
  query: string;
  subject: string;
  sort?: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
        Marketplace search
      </span>
      <h2 className="mt-4 text-3xl font-semibold text-ink">No listings matched that view.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink-soft">
        {query
          ? `Try a broader search than "${query}" or switch back to all marketplace listings.`
          : subject !== "All"
            ? `There are no ${subject} listings in this view right now.`
            : "Clear filters and browse the full marketplace instead."}
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          className="inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          href="/marketplace"
        >
          Browse all listings
        </Link>
        <Link
          className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
          href="/sell/products/new"
        >
          Start selling instead
        </Link>
      </div>
    </div>
  );
}

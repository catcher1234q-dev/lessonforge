import Link from "next/link";

const subjects = ["All", "Math", "ELA", "Science", "Social Studies"];
const trustFilters = [
  { label: "All listings", value: "all" },
  { label: "Asset ready", value: "asset-ready" },
  { label: "Updated assets", value: "updated" },
  { label: "Review backed", value: "review-backed" },
  { label: "Trusted seller", value: "trusted-seller" },
] as const;
const gradeBands = ["All", "K-12", "K-5", "6-8", "9-12"];
const resourceTypes = [
  "All",
  "Lesson plan",
  "Worksheet",
  "Assessment",
  "Slide deck",
  "Intervention resource",
  "Supplemental tool",
];
const priceBands = [
  { label: "Any price", value: "all" },
  { label: "Under $10", value: "under-10" },
  { label: "$10-$15", value: "10-15" },
  { label: "$15+", value: "15-plus" },
] as const;
const sortOptions = [
  { label: "Best match", value: "best-match" },
  { label: "Newest", value: "newest" },
  { label: "Best reviewed", value: "best-reviewed" },
  { label: "Recently updated", value: "recently-updated" },
] as const;

export function FilterBar({
  selectedSubject,
  query,
  selectedTrustFilter,
  selectedGradeBand,
  selectedResourceType,
  selectedPriceFilter,
  selectedSort,
}: {
  selectedSubject: string;
  query: string;
  selectedTrustFilter: string;
  selectedGradeBand: string;
  selectedResourceType: string;
  selectedPriceFilter: string;
  selectedSort: string;
}) {
  function buildHref(next: {
    subject?: string;
    trust?: string;
    grade?: string;
    resourceType?: string;
    price?: string;
    sort?: string;
  }) {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }
    if (next.subject && next.subject !== "All") {
      params.set("subject", next.subject);
    }
    if (next.trust && next.trust !== "all") {
      params.set("trust", next.trust);
    }
    if (next.grade && next.grade !== "All") {
      params.set("grade", next.grade);
    }
    if (next.resourceType && next.resourceType !== "All") {
      params.set("resourceType", next.resourceType);
    }
    if (next.price && next.price !== "all") {
      params.set("price", next.price);
    }
    if (next.sort && next.sort !== "best-match") {
      params.set("sort", next.sort);
    }

    return params.toString() ? `/marketplace?${params.toString()}` : "/marketplace";
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Start here
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Pick a subject
          </p>
        </div>
      <div className="flex flex-wrap gap-3">
        {subjects.map((subject) => {
          const href = buildHref({
            subject,
            trust: selectedTrustFilter,
            grade: selectedGradeBand,
            resourceType: selectedResourceType,
            price: selectedPriceFilter,
            sort: selectedSort,
          });

          return (
            <Link
              key={subject}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedSubject === subject
                  ? "bg-brand text-white"
                  : "bg-white text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)] hover:text-ink"
              }`}
              data-testid={`marketplace-subject-${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              href={href}
            >
              {subject}
            </Link>
          );
        })}
      </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Refine next
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Narrow by trust
          </p>
        </div>
      <div className="flex flex-wrap gap-3">
        {trustFilters.map((filter) => {
          const href = buildHref({
            subject: selectedSubject,
            trust: filter.value,
            grade: selectedGradeBand,
            resourceType: selectedResourceType,
            price: selectedPriceFilter,
            sort: selectedSort,
          });

          return (
            <Link
              key={filter.value}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedTrustFilter === filter.value
                  ? "bg-slate-950 text-white"
                  : "bg-white text-ink-soft shadow-[0_10px_30px_rgba(15,23,42,0.05)] hover:text-ink"
              }`}
              data-testid={`marketplace-trust-${filter.value}`}
              href={href}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Supporting detail
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Grade, type, price, and sort
          </p>
        </div>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          aria-label="Filter by grade band"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
          defaultValue={selectedGradeBand}
          name="grade"
          form="marketplace-filters"
        >
          {gradeBands.map((grade) => (
            <option key={grade} value={grade}>
              {grade === "All" ? "All grade bands" : grade}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by resource type"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
          defaultValue={selectedResourceType}
          name="resourceType"
          form="marketplace-filters"
        >
          {resourceTypes.map((resourceType) => (
            <option key={resourceType} value={resourceType}>
              {resourceType === "All" ? "All resource types" : resourceType}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by price"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
          defaultValue={selectedPriceFilter}
          name="price"
          form="marketplace-filters"
        >
          {priceBands.map((price) => (
            <option key={price.value} value={price.value}>
              {price.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort marketplace results"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
          defaultValue={selectedSort}
          name="sort"
          form="marketplace-filters"
        >
          {sortOptions.map((sort) => (
            <option key={sort.value} value={sort.value}>
              Sort: {sort.label}
            </option>
          ))}
        </select>
      </div>
      </div>
    </div>
  );
}

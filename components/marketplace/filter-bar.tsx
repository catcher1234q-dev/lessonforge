import Link from "next/link";

const subjects = [
  "All",
  "Math",
  "Reading",
  "Writing",
  "Science",
  "Social Studies",
  "Classroom Management",
  "Morning Work",
  "Test Prep",
  "Intervention",
  "Seasonal",
] as const;

export function FilterBar({
  selectedSubject,
  query,
  selectedSort,
}: {
  selectedSubject: string;
  query: string;
  selectedSort: string;
}) {
  function buildHref(subject: string) {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    if (subject !== "All") {
      params.set("subject", subject);
    }

    if (selectedSort !== "best-match") {
      params.set("sort", selectedSort);
    }

    return params.toString() ? `/marketplace?${params.toString()}` : "/marketplace";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Filter by subject
        </p>
        {selectedSubject !== "All" || query ? (
          <Link className="text-sm font-semibold text-brand transition hover:text-brand-700" href="/marketplace">
            Clear filters
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {subjects.map((subject) => (
            <Link
              key={subject}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedSubject === subject
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-ink-soft hover:bg-slate-200 hover:text-ink"
              }`}
              data-analytics-event="marketplace_filter_applied"
              data-analytics-props={JSON.stringify({ filterType: "subject", value: subject })}
              href={buildHref(subject)}
            >
              {subject}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

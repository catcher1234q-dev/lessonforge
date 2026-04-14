type StartHerePanelItem = {
  detail: string;
  label: string;
};

type StartHerePanelProps = {
  className?: string;
  items: StartHerePanelItem[];
  title: string;
};

export function StartHerePanel({
  className = "border-sky-100 bg-sky-50/80",
  items,
  title,
}: StartHerePanelProps) {
  return (
    <div className={`mt-8 rounded-[32px] border px-6 py-6 sm:px-7 sm:py-7 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
        Start here
      </p>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.25rem] border border-white/55 bg-white/70 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <p className="font-semibold text-slate-900">{item.label}</p>
            <p className="mt-2">{item.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm font-medium leading-7 text-slate-900">{title}</p>
    </div>
  );
}

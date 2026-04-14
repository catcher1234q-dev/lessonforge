import { Heart } from "lucide-react";

export function FavoriteFormButton({
  initialFavorited,
  productId,
  compact = false,
  favoritedLabel = "Saved",
  returnTo,
  testId,
  unfavoritedLabel,
}: {
  initialFavorited: boolean;
  productId: string;
  compact?: boolean;
  favoritedLabel?: string;
  returnTo?: string;
  testId?: string;
  unfavoritedLabel?: string;
}) {
  return (
    <form action="/favorites/toggle" method="post">
      <input name="productId" type="hidden" value={productId} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <button
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          initialFavorited
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-white text-ink hover:border-slate-300"
        } ${compact ? "px-3 py-1.5 text-xs" : ""}`}
        data-testid={testId}
        type="submit"
      >
        <Heart className={`h-4 w-4 ${initialFavorited ? "fill-current" : ""}`} />
        {initialFavorited
          ? favoritedLabel
          : unfavoritedLabel ?? (compact ? "Save" : "Save to shortlist")}
      </button>
    </form>
  );
}

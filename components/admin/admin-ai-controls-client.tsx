"use client";

import { useState } from "react";

import type { AdminAiSettings } from "@/types";

export function AdminAiControlsClient({
  initialSettings,
  initialSummary,
}: {
  initialSettings: AdminAiSettings;
  initialSummary: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [summary, setSummary] = useState(initialSummary);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveSettings(nextSettings: AdminAiSettings) {
    setIsSaving(true);
    setMessage(null);

    const response = await fetch("/api/lessonforge/admin-ai-settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aiKillSwitchEnabled: nextSettings.aiKillSwitchEnabled,
        warningThresholds: nextSettings.warningThresholds,
      }),
    });

    const payload = (await response.json()) as {
      settings?: AdminAiSettings;
      error?: string;
    };

    if (!response.ok || !payload.settings) {
      setMessage(payload.error || "Unable to save AI controls.");
      setIsSaving(false);
      return;
    }

    setSettings(payload.settings);
    setSummary(
      "Admin AI controls saved. Refresh the page to recompute the latest risk summary against the new thresholds.",
    );
    setMessage("AI controls updated.");
    setIsSaving(false);
  }

  function updateThreshold(
    key: keyof AdminAiSettings["warningThresholds"],
    value: number,
  ) {
    setSettings((current: AdminAiSettings) => ({
      ...current,
      warningThresholds: {
        ...current.warningThresholds,
        [key]: value,
      },
    }));
  }

  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="text-2xl font-semibold text-ink">AI controls</h2>
      <p className="mt-3 text-sm leading-7 text-ink-soft">{summary}</p>

      <div className="mt-6 rounded-[1.25rem] border border-ink/5 bg-slate-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Global AI toggle
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[false, true].map((value) => (
            <button
              key={String(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                settings.aiKillSwitchEnabled === value
                  ? "bg-brand text-white"
                  : "border border-slate-200 bg-white text-ink"
              }`}
              disabled={isSaving}
              onClick={() =>
                setSettings((current: AdminAiSettings) => ({
                  ...current,
                  aiKillSwitchEnabled: value,
                }))
              }
              type="button"
            >
              {value ? "Kill switch on" : "Kill switch off"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-ink/5 bg-slate-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Warning thresholds
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["starter", "Starter"],
              ["basic", "Basic"],
              ["pro", "Pro"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <input
                className="mt-2 w-full rounded-[1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                disabled={isSaving}
                max={100}
                min={1}
                onChange={(event) =>
                  updateThreshold(
                    key,
                    Number(event.target.value) || settings.warningThresholds[key],
                  )
                }
                type="number"
                value={settings.warningThresholds[key]}
              />
              <p className="mt-2 text-xs text-ink-soft">
                Trigger a warning when sellers on this plan use this percent of their monthly allowance.
              </p>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          disabled={isSaving}
          onClick={() => void saveSettings(settings)}
          type="button"
        >
          {isSaving ? "Saving controls" : "Save AI controls"}
        </button>
        {message ? <p className="text-sm leading-6 text-ink-soft">{message}</p> : null}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

import type { SystemSettings } from "@/types";

export function OwnerSystemControlsClient({
  initialSettings,
}: {
  initialSettings: SystemSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/lessonforge/system-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json()) as {
        settings?: SystemSettings;
        error?: string;
      };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Unable to save system settings.");
      }

      setSettings(payload.settings);
      setMessage(
        payload.settings.maintenanceModeEnabled
          ? "Maintenance mode is now live for all non-owner users."
          : "Maintenance mode is off. The marketplace is fully open again.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save system settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="text-2xl font-semibold text-ink">Owner system controls</h2>
      <p className="mt-3 text-sm leading-7 text-ink-soft">
        Use maintenance mode when you need to protect the platform during launch updates, migrations, or operational issues. Owner access stays live.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex items-start gap-3 rounded-[1.25rem] bg-slate-50 p-4">
          <input
            checked={settings.maintenanceModeEnabled}
            className="mt-1 h-4 w-4 accent-brand"
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                maintenanceModeEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span className="text-sm leading-6 text-ink-soft">
            Enable maintenance mode for all non-owner users
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">Maintenance message</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-[1.25rem] border border-ink/10 bg-surface-subtle px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                maintenanceMessage: event.target.value,
              }))
            }
            value={settings.maintenanceMessage}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Current status: {settings.maintenanceModeEnabled ? "Maintenance on" : "Maintenance off"}
        </p>
        <button
          className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? "Saving system controls" : "Save system controls"}
        </button>
      </div>

      {message ? <p className="mt-4 text-sm leading-6 text-ink-soft">{message}</p> : null}
    </article>
  );
}

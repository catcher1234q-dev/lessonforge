"use client";

import { useEffect, useState } from "react";

type AccessRole = "admin" | "owner";

export function PrivateAccessClient() {
  const [code, setCode] = useState("");
  const [accessRole, setAccessRole] = useState<AccessRole | null>(null);
  const [configured, setConfigured] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/session/private-access");
      const payload = (await response.json()) as {
        accessRole?: AccessRole | null;
        configured?: boolean;
      };

      if (response.ok) {
        setAccessRole(payload.accessRole ?? null);
        setConfigured(payload.configured ?? true);
      }
    })();
  }, []);

  async function handleUnlock() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/session/private-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as { accessRole?: AccessRole; error?: string };

      if (!response.ok || !payload.accessRole) {
        setMessage(payload.error ?? "Access code is not valid.");
        return;
      }

      await fetch("/api/session/viewer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: payload.accessRole }),
      });

      window.location.href = payload.accessRole === "owner" ? "/founder" : "/admin";
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLock() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await fetch("/api/session/private-access", { method: "DELETE" });
      await fetch("/api/session/viewer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "buyer" }),
      });
      window.location.href = "/";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[36px] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
          Private access
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">
          Unlock admin and owner tools on this device.
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-soft">
          This page is not shown in the public navigation. Enter your private access code to open
          income, earnings, moderation, refunds, and owner controls.
        </p>

        {!configured ? (
          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            Private access codes are not configured yet. Add
            {" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">LESSONFORGE_OWNER_ACCESS_CODE</code>
            {" "}
            and optionally
            {" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">LESSONFORGE_ADMIN_ACCESS_CODE</code>
            {" "}
            to enable this lock.
          </div>
        ) : null}

        {accessRole ? (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900">
            Private access is active on this device as
            {" "}
            <span className="font-semibold uppercase">{accessRole}</span>.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="private-access-code">
              Access code
            </label>
            <input
              id="private-access-code"
              className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter private access code"
              type="password"
              value={code}
            />
          </div>

          {message ? (
            <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              disabled={!configured || isSubmitting || !code.trim()}
              onClick={() => void handleUnlock()}
              type="button"
            >
              {isSubmitting ? "Unlocking..." : "Unlock private tools"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300 disabled:opacity-60"
              disabled={isSubmitting || !accessRole}
              onClick={() => void handleLock()}
              type="button"
            >
              Lock this device
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

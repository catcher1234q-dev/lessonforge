"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, CircleUserRound, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";

import { secondaryActionLinkClassName } from "@/components/shared/secondary-action-link";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnv,
} from "@/lib/supabase/client";

export function SignedInHeroCard() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return null;
  }

  const name =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    "Teacher";

  return (
    <section className="px-5 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[1.35rem] border border-brand/10 bg-brand-soft px-5 py-4 shadow-soft-xl sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-white">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Signed In
              </p>
              <p className="mt-1 text-lg font-semibold text-ink sm:text-xl">
                Welcome back, {name}.
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Start from your account overview, then branch into buying or selling from there.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-[0.95rem] border border-white/70 bg-white/80 px-4 py-3.5 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Open account overview</p>
              <p className="mt-1">See purchases, saved items, seller progress, and earnings together.</p>
              <Link
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                href="/account"
              >
                <CircleUserRound className="h-4 w-4" />
                Open account overview
              </Link>
            </div>
            <div className="rounded-[0.95rem] border border-white/70 bg-white/80 px-4 py-3.5 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Browse marketplace</p>
              <p className="mt-1">Go straight into listings, previews, and checkout-ready products.</p>
              <Link
                className={`mt-3 ${secondaryActionLinkClassName("w-fit")}`}
                href="/marketplace"
              >
                <ShoppingBag className="h-4 w-4" />
                Open marketplace
              </Link>
            </div>
            <div className="rounded-[0.95rem] border border-white/70 bg-white/80 px-4 py-3.5 text-sm leading-6 text-ink-soft">
              <p className="font-semibold text-ink">Resume buyer library</p>
              <p className="mt-1">Reopen purchased files, updates, and support follow-up.</p>
              <Link
                className={`mt-3 ${secondaryActionLinkClassName("w-fit")}`}
                href="/library"
              >
                <ArrowRight className="h-4 w-4" />
                Open your purchases
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

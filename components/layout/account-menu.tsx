"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ChevronDown,
  CircleUserRound,
  Library,
  LogOut,
  ShoppingBag,
  Store,
  User2,
} from "lucide-react";
import Link from "next/link";

import { syncViewerCookie } from "@/lib/auth/viewer-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountMenuProps = {
  adminHref: string;
  isOwner: boolean;
  session: Session;
};

export function AccountMenu({ adminHref, isOwner, session }: AccountMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const name =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email ||
    "Teacher";

  async function handleSignOut() {
    setIsSigningOut(true);

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    await syncViewerCookie({ role: "buyer" });

    const shouldLeavePrivateArea =
      pathname?.startsWith("/account") ||
      pathname?.startsWith("/library") ||
      pathname?.startsWith("/favorites") ||
      pathname?.startsWith("/sell");

    setIsSigningOut(false);
    setIsOpen(false);

    if (shouldLeavePrivateArea) {
      router.replace("/");
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="inline-flex items-center gap-3 rounded-full border border-ink/10 bg-white px-3 py-2 text-left shadow-sm transition hover:border-brand/20 hover:bg-brand-soft/30"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold text-ink">
            {name}
          </span>
          <span className="block max-w-40 truncate text-xs text-ink-muted">
            Signed in
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-soft" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.5rem] border border-ink/5 bg-white p-3 shadow-soft-xl">
          <div className="rounded-[1.25rem] bg-surface-subtle p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-ink-muted">
              Signed in as
            </p>
            <p className="mt-2 text-base font-semibold text-ink">{name}</p>
            <p className="mt-1 truncate text-sm text-ink-soft">
              {session.user.email}
            </p>
            {isOwner ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                <ShieldCheck className="h-3.5 w-3.5" />
                Owner
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-[1.25rem] border border-brand/10 bg-brand-soft/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Start here
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">Open your account overview</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Reopen purchases, saved items, seller progress, and earnings from one place.
            </p>
            <Link
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/account"
              onClick={() => setIsOpen(false)}
            >
              <CircleUserRound className="h-4 w-4" />
              Open account overview
            </Link>
            {isOwner ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-4 py-2 text-sm font-semibold text-brand transition hover:border-brand/30 hover:bg-brand-soft/40"
                  href={adminHref}
                  onClick={() => setIsOpen(false)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                  href="/marketplace"
                  onClick={() => setIsOpen(false)}
                >
                  <ShoppingBag className="h-4 w-4" />
                  User view
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-1">
            {isOwner ? (
              <Link
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface-subtle"
                href={adminHref}
                onClick={() => setIsOpen(false)}
              >
                <ShieldCheck className="h-4 w-4 text-brand" />
                Founder dashboard
              </Link>
            ) : null}
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/sell/dashboard"
              onClick={() => setIsOpen(false)}
            >
              <Store className="h-4 w-4 text-brand" />
              Seller dashboard
            </Link>
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/sell/onboarding"
              onClick={() => setIsOpen(false)}
            >
              <User2 className="h-4 w-4 text-brand" />
              Seller setup and payouts
            </Link>
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/favorites"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="h-4 w-4 text-brand" />
              Saved items
            </Link>
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/library"
              onClick={() => setIsOpen(false)}
            >
              <Library className="h-4 w-4 text-brand" />
              Purchases
            </Link>
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/sell/products/new"
              onClick={() => setIsOpen(false)}
            >
              <Store className="h-4 w-4 text-brand" />
              Create a listing
            </Link>
            <Link
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle"
              href="/marketplace"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBag className="h-4 w-4 text-brand" />
              Browse marketplace
            </Link>
            <button
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-subtle disabled:opacity-60"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              <LogOut className="h-4 w-4 text-brand" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

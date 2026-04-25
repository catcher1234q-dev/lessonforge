"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthControls } from "@/components/layout/auth-controls";

type HeaderLink = {
  description?: string;
  href: string;
  label: string;
};

type SiteHeaderShellProps = {
  adminHref: string;
  isOwner: boolean;
  productName: string;
  primaryLinks: HeaderLink[];
  secondaryLinks: HeaderLink[];
};

export function SiteHeaderShell({
  adminHref,
  isOwner,
  productName,
  primaryLinks,
  secondaryLinks,
}: SiteHeaderShellProps) {
  const [isCondensed, setIsCondensed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldCondense = window.scrollY > 36;
      setIsCondensed((current) => (current === shouldCondense ? current : shouldCondense));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl transition-all duration-300 ${
        isCondensed ? "shadow-soft-xl" : ""
      }`}
    >
      <div
        className={`mx-auto w-full max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          isCondensed ? "py-3" : "py-4"
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 transition-all duration-300 sm:gap-4 lg:flex-nowrap lg:gap-6 ${
            isCondensed ? "" : ""
          }`}
        >
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <div
              className={`flex shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20 transition-all duration-300 ${
                isCondensed ? "h-9 w-9" : "h-10 w-10"
              }`}
            >
              <Sparkles className={`${isCondensed ? "h-4 w-4" : "h-5 w-5"}`} />
            </div>
            <div className="min-w-0">
              <p
                className={`font-[family-name:var(--font-display)] leading-none tracking-[-0.03em] text-ink transition-all duration-300 ${
                  isCondensed ? "text-[1.15rem] sm:text-[1.35rem]" : "text-[1.35rem] sm:text-[1.7rem]"
                }`}
              >
                {productName}
              </p>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-soft hover:text-brand"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
            {secondaryLinks.map((link) => (
              <Link
                key={link.href}
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            <AuthControls adminHref={adminHref} isOwner={isOwner} />
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            isCondensed
              ? "mt-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none"
              : "mt-3 max-h-28 translate-y-0 opacity-100"
          }`}
        >
          <nav className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 text-sm text-ink [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-surface-muted px-4 py-2 font-medium transition hover:bg-brand-soft hover:text-brand"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
            {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-4 py-2 font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

import type { Metadata } from "next";

import { ResetPasswordContent } from "@/app/auth/reset-password/reset-password-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata(
  "Reset Password",
  "Private LessonForgeHub password reset page.",
);

export default function AccountResetPasswordPage() {
  return (
    <main className="page-shell min-h-screen">
      <SiteHeader />
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl justify-center">
          <ResetPasswordContent />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

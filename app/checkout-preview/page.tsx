import { Suspense } from "react";

import { CheckoutPreviewContent } from "@/app/checkout-preview/checkout-preview-content";
import { AppAccessGate } from "@/components/account/app-access-gate";
import { getViewerContext } from "@/lib/lessonforge/server-operations";

export default async function CheckoutPreviewPage() {
  const viewer = await getViewerContext();

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-16 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <AppAccessGate area="buyer">
          <CheckoutPreviewContent viewer={viewer} />
        </AppAccessGate>
      </Suspense>
    </main>
  );
}

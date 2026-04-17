import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { toggleFavorite } from "@/lib/lessonforge/data-access";

function getReturnUrl(request: Request, formData?: FormData) {
  const explicitReturnTo = String(formData?.get("returnTo") ?? "").trim();

  if (explicitReturnTo.startsWith("/")) {
    return new URL(explicitReturnTo, request.url);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const url = new URL(referer);

      if (url.origin === new URL(request.url).origin) {
        return url;
      }
    } catch {
      // Fall back to the shortlist page below.
    }
  }

  return new URL("/favorites", request.url);
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  const formData = await request.formData();
  const returnUrl = getReturnUrl(request, formData);

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.redirect(returnUrl);
  }

  if (viewer.role !== "buyer") {
    return NextResponse.redirect(returnUrl);
  }

  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    return NextResponse.redirect(returnUrl);
  }

  await toggleFavorite(viewer.email, productId);

  return NextResponse.redirect(returnUrl);
}

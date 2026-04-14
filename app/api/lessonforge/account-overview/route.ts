import { NextResponse } from "next/server";

import { getAppSessionEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getAccountOverview } from "@/lib/lessonforge/server-operations";

export async function GET() {
  const [appSessionEmail, viewer] = await Promise.all([
    getAppSessionEmail(),
    getCurrentViewer(),
  ]);

  if (!appSessionEmail || appSessionEmail !== viewer.email.toLowerCase()) {
    return NextResponse.json({ error: "Signed-in account access required." }, { status: 401 });
  }

  const overview = await getAccountOverview();
  return NextResponse.json(overview);
}

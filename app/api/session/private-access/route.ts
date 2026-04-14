import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  PRIVATE_ACCESS_COOKIE,
  buildPrivateAccessCookieValue,
  getPrivateAccessRole,
  isPrivateAccessConfigured,
  resolvePrivateAccessRoleFromCode,
} from "@/lib/auth/private-access";

export async function GET() {
  const accessRole = await getPrivateAccessRole();
  return NextResponse.json({
    accessRole,
    configured: isPrivateAccessConfigured(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const role = resolvePrivateAccessRoleFromCode(body.code ?? "");

  if (!isPrivateAccessConfigured()) {
    return NextResponse.json(
      { error: "Private access is not configured yet." },
      { status: 503 },
    );
  }

  if (!role) {
    return NextResponse.json({ error: "Access code is not valid." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(PRIVATE_ACCESS_COOKIE, buildPrivateAccessCookieValue(role), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ accessRole: role });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(PRIVATE_ACCESS_COOKIE);
  return NextResponse.json({ ok: true });
}

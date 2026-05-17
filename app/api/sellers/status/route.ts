import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { listSellerProfiles } from "@/lib/lessonforge/data-access";

type SellerStatusRequest = {
  accounts?: Array<{
    accountId?: string;
    sellerAccountEnvKey?: string;
    key?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const viewer = await getCurrentViewer();

    if (!(await hasAppSessionForEmail(viewer.email))) {
      return NextResponse.json({ error: "Signed-in seller access required." }, { status: 401 });
    }

    if (viewer.role !== "seller" && viewer.role !== "admin" && viewer.role !== "owner") {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    const body = (await request.json()) as SellerStatusRequest;
    const requestedAccounts = body.accounts ?? [];
    const profiles = await listSellerProfiles();
    const viewerProfile =
      profiles.find(
        (profile) => profile.email.trim().toLowerCase() === viewer.email.trim().toLowerCase(),
      ) ?? null;

    const accounts =
      viewer.role === "seller"
        ? requestedAccounts.filter(
            (account) =>
              (account.accountId && account.accountId === viewerProfile?.paypalMerchantId) ||
              (!account.accountId && viewerProfile?.paypalMerchantId),
          )
        : requestedAccounts;

    if (viewer.role === "seller" && requestedAccounts.length > 0 && accounts.length !== requestedAccounts.length) {
      return NextResponse.json(
        { error: "You can only request payout status for your own seller account." },
        { status: 403 },
      );
    }

    const statuses = accounts.map((account) => {
      const profile =
        profiles.find((entry) => entry.paypalMerchantId === account.accountId) ??
        viewerProfile;
      const ready = Boolean(
        profile?.paypalMerchantId &&
          profile.paypalPayoutsEnabled &&
          profile.paypalConsentGranted,
      );

      return [
        account.key ?? profile?.paypalMerchantId ?? "paypal",
        {
          accountId: profile?.paypalMerchantId ?? account.accountId ?? null,
          status: ready ? "live" : "incomplete",
          chargesEnabled: ready,
          payoutsEnabled: ready,
          transferStatus: ready ? "active" : null,
          payoutStatus: ready ? "active" : null,
          disabledReason: ready ? null : "paypal_setup_incomplete",
          provider: "paypal",
        },
      ] as const;
    });

    return NextResponse.json({
      statuses: Object.fromEntries(statuses),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve seller status.",
      },
      { status: 500 },
    );
  }
}

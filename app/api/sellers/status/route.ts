import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getSellerPayoutStatusDetails } from "@/lib/stripe/connect";
import { getSupabaseSellerProfile } from "@/lib/supabase/admin-sync";

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
    const viewerProfile =
      viewer.role === "seller" ? await getSupabaseSellerProfile(viewer.email).catch(() => null) : null;
    const accounts =
      viewer.role === "seller"
        ? requestedAccounts.filter(
            (account) =>
              (account.accountId && account.accountId === viewerProfile?.stripeAccountId) ||
              (!account.accountId && viewerProfile?.stripeAccountId),
          )
        : requestedAccounts;

    if (viewer.role === "seller" && requestedAccounts.length > 0 && accounts.length !== requestedAccounts.length) {
      return NextResponse.json(
        { error: "You can only request payout status for your own seller account." },
        { status: 403 },
      );
    }

    const statuses = await Promise.all(
      accounts.map(async (account) => {
        const details = await getSellerPayoutStatusDetails(
          account.accountId ?? viewerProfile?.stripeAccountId,
          viewer.role === "seller" ? undefined : account.sellerAccountEnvKey,
        );

        return [account.key ?? details.accountId ?? "unknown", details] as const;
      }),
    );

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

import { NextResponse } from "next/server";

import { getSellerPayoutStatusDetails } from "@/lib/stripe/connect";

type SellerStatusRequest = {
  accounts?: Array<{
    accountId?: string;
    sellerAccountEnvKey?: string;
    key?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SellerStatusRequest;
    const accounts = body.accounts ?? [];

    const statuses = await Promise.all(
      accounts.map(async (account) => {
        const details = await getSellerPayoutStatusDetails(
          account.accountId,
          account.sellerAccountEnvKey,
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

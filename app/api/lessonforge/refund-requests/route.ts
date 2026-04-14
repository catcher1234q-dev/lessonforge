import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  handleRefundRequestCreate,
  handleRefundRequestPatch,
} from "@/lib/lessonforge/api-handlers";
import {
  listOrders,
  listRefundRequests,
  saveRefundRequest,
  updateRefundRequestStatus,
} from "@/lib/lessonforge/repository";
import type { RefundRequestRecord } from "@/types";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in access required." }, { status: 401 });
  }

  if (viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const refundRequests = await listRefundRequests();
  return NextResponse.json({ refundRequests });
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  const body = (await request.json()) as {
    orderId?: string;
    productId?: string;
    productTitle?: string;
    buyerName?: string;
    buyerEmail?: string;
    sellerName?: string;
    reason?: string;
  };

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json({ error: "Buyer access required." }, { status: 403 });
  }

  if (body.buyerEmail && body.buyerEmail !== viewer.email) {
    return NextResponse.json(
      { error: "You can only submit refund requests from your own buyer account." },
      { status: 403 },
    );
  }

  body.buyerEmail = viewer.email;
  body.buyerName = body.buyerName || viewer.name;

  const response = await handleRefundRequestCreate(body, {
    listOrders,
    listRefundRequests,
    saveRefundRequest,
    updateRefundRequestStatus,
  });

  return NextResponse.json(response.body, { status: response.status });
}

export async function PATCH(request: Request) {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in admin access required." }, { status: 401 });
  }

  if (viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const rateLimit = checkAdminMutationRateLimit({
    actorEmail: viewer.email,
    actorRole: viewer.role,
    actionKey: "refund-review",
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached for refund actions. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    refundRequestId?: string;
    status?: NonNullable<RefundRequestRecord["status"]>;
    adminResolutionNote?: string;
  };

  const response = await handleRefundRequestPatch(body, {
    listOrders,
    listRefundRequests,
    saveRefundRequest,
    updateRefundRequestStatus: (refundRequestId, status, adminResolutionNote) =>
      updateRefundRequestStatus(refundRequestId, status, adminResolutionNote, {
        email: viewer.email,
        role: viewer.role,
      }),
  });

  return NextResponse.json(response.body, { status: response.status });
}

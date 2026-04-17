import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { checkAdminMutationRateLimit } from "@/lib/lessonforge/admin-rate-limit";
import {
  handleReportCreate,
  handleReportPatch,
} from "@/lib/lessonforge/api-handlers";
import {
  listReports,
  saveReport,
  updateReportStatus,
} from "@/lib/lessonforge/data-access";
import type { ReportRecord } from "@/types";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in access required." }, { status: 401 });
  }

  if (viewer.role !== "admin" && viewer.role !== "owner") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reports = await listReports();
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();
  const body = (await request.json()) as { report?: ReportRecord };

  if (!(await hasAppSessionForEmail(viewer.email))) {
    return NextResponse.json({ error: "Signed-in buyer access required." }, { status: 401 });
  }

  if (viewer.role !== "buyer") {
    return NextResponse.json({ error: "Buyer access required." }, { status: 403 });
  }

  if (
    body.report?.reporterEmail &&
    body.report.reporterEmail !== viewer.email
  ) {
    return NextResponse.json(
      { error: "You can only submit reports from your own buyer account." },
      { status: 403 },
    );
  }

  if (body.report) {
    body.report = {
      ...body.report,
      reporterEmail: viewer.email,
      reporterName: body.report.reporterName || viewer.name,
    };
  }

  const response = await handleReportCreate(body, {
    listReports,
    saveReport,
    updateReportStatus,
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
    actionKey: "report-triage",
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached for report actions. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    reportId?: string;
    status?: NonNullable<ReportRecord["status"]>;
    adminResolutionNote?: string;
  };
  const response = await handleReportPatch(body, {
    listReports,
    saveReport,
    updateReportStatus: (reportId, status, adminResolutionNote) =>
      updateReportStatus(reportId, status, adminResolutionNote, {
        email: viewer.email,
        role: viewer.role,
      }),
  });
  return NextResponse.json(response.body, { status: response.status });
}

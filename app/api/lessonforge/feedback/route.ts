import { NextResponse } from "next/server";

import { hasAppSessionForEmail } from "@/lib/auth/app-session";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { savePrivateFeedback } from "@/lib/lessonforge/data-access";
import type { FeedbackRating } from "@/types";

const validRatings: FeedbackRating[] = ["Easy", "Okay", "Confusing"];

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanRating(value: unknown) {
  return validRatings.includes(value as FeedbackRating)
    ? (value as FeedbackRating)
    : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      confusingText?: unknown;
      improvementText?: unknown;
      contact?: unknown;
      pageContext?: unknown;
      source?: unknown;
      rating?: unknown;
    };
    const confusingText = cleanText(body.confusingText, 2000);
    const improvementText = cleanText(body.improvementText, 2000);
    const contact = cleanText(body.contact, 200);
    const pageContext = cleanText(body.pageContext, 300);
    const source = cleanText(body.source, 120);
    const rating = cleanRating(body.rating);

    if (!confusingText && !improvementText && !rating) {
      return NextResponse.json(
        { error: "Share one quick note or choose an experience rating." },
        { status: 400 },
      );
    }

    const viewer = await getCurrentViewer();
    const signedIn = await hasAppSessionForEmail(viewer.email).catch(() => false);
    const feedback = await savePrivateFeedback({
      confusingText,
      improvementText,
      contact,
      pageContext,
      source,
      rating,
      signedIn,
      userEmail: signedIn ? viewer.email : undefined,
      userRole: signedIn ? viewer.role : undefined,
    });

    return NextResponse.json({ feedback: { id: feedback.id } });
  } catch (error) {
    console.error(
      "[lessonforge:feedback] submit failed",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: "Unable to save feedback right now. Please try again later." },
      { status: 500 },
    );
  }
}

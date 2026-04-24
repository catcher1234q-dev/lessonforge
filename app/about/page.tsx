import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn what LessonForgeHub is, who it serves, and how it supports teacher creators and buyers.",
  path: "/about",
});

const sections = [
  {
    title: "What LessonForgeHub is",
    body: [
      "LessonForgeHub is operated by LessonForge LLC, a registered U.S. business.",
      "LessonForge LLC is located at 2730 Dale St. North, Roseville, MN 55113.",
      "LessonForgeHub is a digital marketplace for teacher-created classroom resources. Educators can upload original materials, and buyers can purchase digital downloads they can use in class right away.",
      "LessonForgeHub sells digital educational downloads only. No physical products are sold or shipped.",
      "The goal is to give teacher creators a clearer place to sell their work and give buyers a faster way to find polished printable resources, warm-ups, units, task cards, and practice packs.",
    ],
  },
  {
    title: "Who it serves",
    body: [
      "LessonForgeHub is built for classroom teachers, interventionists, tutors, and school teams who need ready-to-use materials.",
      "It is also built for teacher sellers who want a straightforward way to publish original resources, show previews, and receive payouts through the platform.",
    ],
  },
  {
    title: "How the marketplace works",
    body: [
      "LessonForgeHub is a digital marketplace where independent educators upload and sell original or properly licensed classroom resources. LessonForgeHub facilitates marketplace access, digital delivery, seller policy enforcement, refund review, and platform commission collection.",
      "LessonForgeHub is not the seller of record for individual products. Products are sold by independent sellers on the marketplace.",
      "Sellers upload original teaching resources they created or have the right to distribute, add previews and listing details, and publish them through the marketplace.",
      "Buyers browse listings, review previews, purchase digital downloads through the platform, and return to their library to access purchased files.",
    ],
  },
  {
    title: "How LessonForgeHub supports trust",
    body: [
      "Listings are reviewed for quality and compliance, buyers can report products, and violating listings may be removed.",
      "Digital refund rules, support contact paths, and seller responsibility rules are visible so buyers and sellers understand how the marketplace is controlled.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <LegalPageShell
      eyebrow="About"
      intro="This page explains what LessonForgeHub is, why it exists, and how it supports both teacher creators and teacher buyers."
      sections={[...sections]}
      title="About LessonForgeHub"
      updatedLabel="Last updated: April 19, 2026"
    />
  );
}

import { promises as fs } from "node:fs";
import path from "node:path";

import { PlanKey, RolloverPolicy, SubscriptionStatus, UserRole, UsageEntryType } from "@prisma/client";

import { demoResources } from "@/lib/demo/example-resources";
import { prisma } from "@/lib/prisma/client";
import {
  prismaSaveOrder,
  prismaSaveProduct,
  prismaSaveRefundRequest,
  prismaSaveReview,
  prismaSaveSellerProfile,
} from "@/lib/lessonforge/repository-prisma";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const seedStandards = [
  {
    code: "CCSS.MATH.CONTENT.5.NBT.B.7",
    framework: "Common Core Math",
    subject: "Math",
    gradeBand: "Grade 5",
    description:
      "Add, subtract, multiply, and divide decimals to hundredths using concrete models or drawings.",
  },
  {
    code: "CCSS.ELA-LITERACY.RL.4.1",
    framework: "Common Core ELA",
    subject: "ELA",
    gradeBand: "Grade 4",
    description:
      "Refer to details and examples in a text when explaining what the text says explicitly and when drawing inferences.",
  },
  {
    code: "CCSS.ELA-LITERACY.W.5.4",
    framework: "Common Core ELA",
    subject: "ELA",
    gradeBand: "Grade 5",
    description:
      "Produce clear and coherent writing in which the development and organization are appropriate to task, purpose, and audience.",
  },
];

async function seedStandardsData() {
  for (const standard of seedStandards) {
    await prisma.standard.upsert({
      where: { code: standard.code },
      update: standard,
      create: standard,
    });
  }
}

async function seedDemoUsers() {
  const users = [
    {
      email: "buyer@lessonforge.demo",
      name: "Jordan Teacher",
      role: UserRole.USER,
    },
    {
      email: "owner@lessonforge.demo",
      name: "LessonForge Owner",
      role: UserRole.OWNER,
    },
    {
      email: "admin@lessonforge.demo",
      name: "LessonForge Admin",
      role: UserRole.ADMIN,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
      },
      create: user,
    });
  }
}

async function seedDemoMarketplaceProducts() {
  for (const resource of demoResources) {
    await prismaSaveProduct({
      id: resource.id,
      title: resource.title,
      subject: resource.subject,
      gradeBand: resource.gradeBand,
      standardsTag: resource.standardsTag,
      updatedAt: resource.updatedAt,
      format: resource.format,
      summary: resource.summary,
      demoOnly: resource.demoOnly,
      sellerName: resource.sellerName,
      sellerHandle: resource.sellerHandle,
      sellerId:
        resource.sellerId && resource.sellerId.includes("@")
          ? resource.sellerId
          : `${resource.sellerId ?? "seller"}@lessonforge.demo`,
      sellerStripeAccountId: resource.sellerStripeAccountId,
      priceCents: resource.priceCents,
      isPurchasable: resource.isPurchasable,
      licenseType: "Single classroom",
      fileTypes: [resource.format],
      includedItems: ["Teacher guide", "Student-facing pages", "Implementation notes"],
      previewIncluded: true,
      thumbnailIncluded: true,
      rightsConfirmed: true,
      productStatus: "Published",
      createdPath: "Manual upload",
    });
  }
}

async function importLocalDemoData() {
  const raw = await fs.readFile(DB_PATH, "utf8");
  const parsed = JSON.parse(raw) as {
    lessonforge?: {
      sellerProfiles?: Array<{
        displayName: string;
        email: string;
        storeName: string;
        storeHandle: string;
        primarySubject: string;
        tagline: string;
        sellerPlanKey: "starter" | "basic" | "pro";
        onboardingCompleted: boolean;
      }>;
      products?: Array<Record<string, unknown>>;
      orders?: Array<Record<string, unknown>>;
      reviews?: Array<Record<string, unknown>>;
      refundRequests?: Array<Record<string, unknown>>;
      subscriptions?: Array<{
        sellerId: string;
        sellerEmail: string;
        planKey: "starter" | "basic" | "pro";
        monthlyCredits: number;
        availableCredits: number;
      }>;
      usageLedger?: Array<{
        id: string;
        sellerId: string;
        action:
          | "titleSuggestion"
          | "descriptionRewrite"
          | "standardsScan"
          | "thumbnailGeneration"
          | "previewGeneration";
        creditsUsed: number;
        refundedCredits: number;
        idempotencyKey: string;
        provider: "openai" | "gemini";
        createdAt: string;
      }>;
    };
  };

  for (const profile of parsed.lessonforge?.sellerProfiles ?? []) {
    await prismaSaveSellerProfile(profile);
  }

  for (const product of parsed.lessonforge?.products ?? []) {
    await prismaSaveProduct(product as never);
  }

  for (const order of parsed.lessonforge?.orders ?? []) {
    await prismaSaveOrder(order as never);
  }

  for (const review of parsed.lessonforge?.reviews ?? []) {
    try {
      await prismaSaveReview(review as never);
    } catch {
      // Ignore duplicate or out-of-order review imports during bootstrap.
    }
  }

  for (const refundRequest of parsed.lessonforge?.refundRequests ?? []) {
    try {
      await prismaSaveRefundRequest(refundRequest as never);
    } catch {
      // Ignore duplicate or out-of-order refund imports during bootstrap.
    }
  }

  for (const subscription of parsed.lessonforge?.subscriptions ?? []) {
    const user = await prisma.user.upsert({
      where: { email: subscription.sellerEmail },
      update: {
        role: UserRole.USER,
      },
      create: {
        email: subscription.sellerEmail,
        name: subscription.sellerId,
        role: UserRole.USER,
      },
    });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planKey:
          subscription.planKey === "basic"
            ? PlanKey.BASIC
            : subscription.planKey === "pro"
              ? PlanKey.PRO
              : PlanKey.STARTER,
        status: SubscriptionStatus.ACTIVE,
        monthlyCreditAllowance: subscription.monthlyCredits,
        hardMonthlyCreditCap: subscription.monthlyCredits,
        rolloverPolicy: RolloverPolicy.NONE,
      },
      create: {
        userId: user.id,
        planKey:
          subscription.planKey === "basic"
            ? PlanKey.BASIC
            : subscription.planKey === "pro"
              ? PlanKey.PRO
              : PlanKey.STARTER,
        status: SubscriptionStatus.ACTIVE,
        monthlyCreditAllowance: subscription.monthlyCredits,
        hardMonthlyCreditCap: subscription.monthlyCredits,
        rolloverPolicy: RolloverPolicy.NONE,
      },
    });

    await prisma.creditBalance.upsert({
      where: { userId: user.id },
      update: {
        availableCredits: subscription.availableCredits,
      },
      create: {
        userId: user.id,
        availableCredits: subscription.availableCredits,
      },
    });
  }

  for (const entry of parsed.lessonforge?.usageLedger ?? []) {
    const user = await prisma.user.findUnique({
      where: { email: entry.sellerId },
    });

    if (!user) {
      continue;
    }

    await prisma.usageLedger.upsert({
      where: { idempotencyKey: entry.idempotencyKey },
      update: {
        creditsUsed: entry.creditsUsed,
        refundedCredits: entry.refundedCredits,
        providerName: entry.provider,
      },
      create: {
        id: entry.id,
        userId: user.id,
        entryType: entry.refundedCredits > 0 ? UsageEntryType.REFUND : UsageEntryType.DEBIT,
        action:
          entry.action === "titleSuggestion"
            ? "TITLE_SUGGESTION"
            : entry.action === "descriptionRewrite"
              ? "DESCRIPTION_REWRITE"
              : entry.action === "thumbnailGeneration"
                ? "THUMBNAIL_GENERATION"
                : entry.action === "previewGeneration"
                  ? "PREVIEW_GENERATION"
                  : "STANDARDS_SCAN",
        creditsUsed: entry.creditsUsed,
        refundedCredits: entry.refundedCredits,
        idempotencyKey: entry.idempotencyKey,
        providerName: entry.provider,
        createdAt: new Date(entry.createdAt),
      },
    });
  }
}

async function main() {
  process.env.LESSONFORGE_PERSISTENCE_MODE = "prisma";

  await seedStandardsData();
  await seedDemoUsers();
  await seedDemoMarketplaceProducts();

  if (process.argv.includes("--import-demo")) {
    await importLocalDemoData();
    console.log("Imported local LessonForge demo data into Prisma.");
  }

  console.log(`Seeded standards: ${seedStandards.length}`);
  console.log(`Seeded demo marketplace products: ${demoResources.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

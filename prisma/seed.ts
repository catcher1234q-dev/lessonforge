import { UserRole } from "@prisma/client";

import { demoResources } from "@/lib/demo/example-resources";
import { prisma } from "@/lib/prisma/client";
import {
  prismaSaveProduct,
} from "@/lib/lessonforge/repository-prisma";

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

async function main() {
  process.env.LESSONFORGE_PERSISTENCE_MODE = "prisma";

  await seedStandardsData();
  await seedDemoUsers();
  await seedDemoMarketplaceProducts();

  if (process.argv.includes("--import-demo")) {
    throw new Error(
      "--import-demo is no longer supported because file-based demo imports were removed.",
    );
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

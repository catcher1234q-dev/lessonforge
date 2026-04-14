import {
  expect,
  test,
  type Page,
} from "@playwright/test";
import { PERSISTENCE_READINESS_API_PATH } from "@/lib/lessonforge/persistence-readiness-client";
import type { ProductRecord } from "@/types";

const APP_URL = "http://localhost:3000";
const OWNER_ACCESS_CODE =
  process.env.LESSONFORGE_OWNER_ACCESS_CODE ?? "lessonforge-owner-local";
const ADMIN_ACCESS_CODE =
  process.env.LESSONFORGE_ADMIN_ACCESS_CODE ?? "lessonforge-admin-local";

const seededSellerProfile = {
  displayName: "Avery Johnson",
  email: "avery@lessonforge.demo",
  storeName: "Avery Johnson",
  storeHandle: "avery-johnson",
  primarySubject: "Math",
  tagline: "",
  sellerPlanKey: "basic",
  onboardingCompleted: false,
};
const UPLOADED_RESOURCES_STORAGE_KEY = "teachready-uploaded-resources";
type SeededSellerProfile = typeof seededSellerProfile;

async function requestJson<T>(
  page: Page,
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  },
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (page.url() === "about:blank") {
        await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
      }

      const response = await page.evaluate(
        async ({ appUrl, requestPath, requestOptions }) => {
          const fetchResponse = await fetch(`${appUrl}${requestPath}`, {
            method: requestOptions.method ?? "GET",
            headers: requestOptions.body
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
            body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
          });

          return {
            ok: fetchResponse.ok,
            status: fetchResponse.status,
            body: (await fetchResponse.json()) as T,
          };
        },
        {
          appUrl: APP_URL,
          requestPath: path,
          requestOptions: {
            method: options?.method ?? "GET",
            body: options?.body,
          },
        },
      );

      return response;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransientReset =
        message.includes("ECONNRESET") || message.includes("socket hang up");

      if (!isTransientReset || attempt === 2) {
        throw error;
      }

      await page.waitForTimeout(250 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function switchViewerRole(page: Page, role: "buyer" | "seller" | "admin" | "owner") {
  if (page.url() === "about:blank") {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  }

  if (role === "admin" || role === "owner") {
    const unlockPayload = await page.evaluate(
      async ({ appUrl, code }) => {
        const response = await fetch(`${appUrl}/api/session/private-access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        return {
          ok: response.ok,
          body: await response.json(),
        };
      },
      {
        appUrl: APP_URL,
        code: role === "owner" ? OWNER_ACCESS_CODE : ADMIN_ACCESS_CODE,
      },
    );

    expect(unlockPayload.ok).toBeTruthy();
  }

  const payload = await page.evaluate(async ({ nextRole, appUrl }) => {
    const sellerProfileRaw =
      nextRole === "seller"
        ? window.localStorage.getItem("lessonforge-seller-profile")
        : null;
    const sellerProfile = sellerProfileRaw
      ? (JSON.parse(sellerProfileRaw) as {
          email?: string;
          displayName?: string;
        })
      : null;

    const response = await fetch(`${appUrl}/api/session/viewer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: nextRole,
        ...(nextRole === "seller" && sellerProfile?.email
          ? {
              email: sellerProfile.email,
              name: sellerProfile.displayName ?? "Seller",
              sellerDisplayName: sellerProfile.displayName ?? "Seller",
            }
          : {}),
      }),
    });

    return {
      ok: response.ok,
      body: await response.json(),
    };
  }, { nextRole: role, appUrl: APP_URL });

  expect(payload.ok).toBeTruthy();
}

async function switchViewerIdentity(
  page: Page,
  role: "buyer" | "seller",
  identity: {
    email: string;
    name: string;
    sellerDisplayName?: string;
  },
) {
  if (page.url() === "about:blank") {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  }

  const payload = await page.evaluate(
    async ({ nextRole, nextIdentity, appUrl }) => {
      const response = await fetch(`${appUrl}/api/session/viewer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nextRole,
          email: nextIdentity.email,
          name: nextIdentity.name,
          sellerDisplayName: nextIdentity.sellerDisplayName,
        }),
      });

      return {
        ok: response.ok,
        body: await response.json(),
      };
    },
    {
      nextRole: role,
      nextIdentity: identity,
      appUrl: APP_URL,
    },
  );

  expect(payload.ok).toBeTruthy();
}

async function updateAdminAiSettings(
  page: Page,
  aiKillSwitchEnabled: boolean,
) {
  const previousViewerPayload = await requestJson<{
    viewer?: {
      role?: "buyer" | "seller" | "admin" | "owner";
      email?: string;
      name?: string;
      sellerDisplayName?: string;
    };
  }>(page, "/api/session/viewer");
  const previousViewer = previousViewerPayload.body.viewer;

  await switchViewerRole(page, "owner");

  const payload = await requestJson(page, "/api/lessonforge/admin-ai-settings", {
    method: "PATCH",
    body: {
      aiKillSwitchEnabled,
      warningThresholds: {
        starter: 70,
        basic: 80,
        pro: 85,
      },
    },
  });

  expect(payload.ok).toBeTruthy();

  if (previousViewer?.role === "seller" && previousViewer.email && previousViewer.name) {
    await switchViewerIdentity(page, "seller", {
      email: previousViewer.email,
      name: previousViewer.name,
      sellerDisplayName: previousViewer.sellerDisplayName ?? previousViewer.name,
    });
    return;
  }

  if (previousViewer?.role === "buyer" && previousViewer.email && previousViewer.name) {
    await switchViewerIdentity(page, "buyer", {
      email: previousViewer.email,
      name: previousViewer.name,
    });
    return;
  }

  if (previousViewer?.role === "admin" || previousViewer?.role === "owner") {
    await switchViewerRole(page, previousViewer.role);
  }
}

async function syncAdminAiSettings(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.reload();
  await page.waitForLoadState("networkidle");
}

async function waitForSellerDashboard(page: Page) {
  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/, { timeout: 15000 });
  await expect(page.getByTestId("seller-dashboard-ready")).toHaveCount(1, {
    timeout: 15000,
  });
  await expect(page.getByTestId("seller-dashboard-create-product")).toBeVisible({
    timeout: 15000,
  });
}

async function waitForAdminDashboard(page: Page) {
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Moderation queue" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('[data-testid^="admin-product-note-"]').first()).toBeEnabled({
    timeout: 15000,
  });
}

async function waitForSellerEditor(page: Page) {
  await expect(page.getByTestId("seller-editor-title")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("seller-editor-notes")).toBeVisible({ timeout: 15000 });
}

async function seedUploadedResource(page: Page, resource: unknown) {
  await page.evaluate(
    ({ nextResource, storageKey }) => {
      const current = window.localStorage.getItem(storageKey);
      const parsed = current ? (JSON.parse(current) as unknown[]) : [];
      const withoutDuplicate = parsed.filter((entry) => {
        return !entry || typeof entry !== "object" || (entry as { id?: string }).id !== (nextResource as { id?: string }).id;
      });

      window.localStorage.setItem(
        storageKey,
        JSON.stringify([nextResource, ...withoutDuplicate]),
      );
    },
    { nextResource: resource, storageKey: UPLOADED_RESOURCES_STORAGE_KEY },
  );
}

async function seedSellerProfile(
  page: Page,
  profileOverrides: Partial<SeededSellerProfile> = {},
) {
  const profile = {
    ...seededSellerProfile,
    ...profileOverrides,
  };

  await switchViewerIdentity(page, "seller", {
    email: profile.email,
    name: profile.displayName,
    sellerDisplayName: profile.displayName,
  });
  const savePayload = await requestJson(page, "/api/lessonforge/seller-profile", {
    method: "POST",
    body: { profile },
  });
  expect(savePayload.ok).toBeTruthy();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((profile) => {
    window.localStorage.setItem(
      "lessonforge-seller-profile",
      JSON.stringify(profile),
    );
    window.localStorage.setItem(
      "teachready-connected-seller",
      JSON.stringify({
        email: profile.email,
        stripeConnected: false,
        stripeStatus: "Not connected",
      }),
    );
  }, profile);

  return profile;
}

async function fetchPersistenceReadiness(page: Page) {
  return page.evaluate(async (path) => {
    const response = await fetch(path, {
      cache: "no-store",
    });

    return {
      ok: response.ok,
      status: response.status,
      body: await response.json(),
    };
  }, PERSISTENCE_READINESS_API_PATH);
}

test("seller dashboard reflects the persisted seller plan", async ({ page }) => {
  await seedSellerProfile(page);
  const sellerProfiles = await requestJson<{
    profiles: Array<{ email: string; sellerPlanKey: string }>;
  }>(page, "/api/lessonforge/seller-profile");

  expect(sellerProfiles.body.profiles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        email: "avery@lessonforge.demo",
        sellerPlanKey: "starter",
      }),
    ]),
  );

  await page.goto("/sell/dashboard");
  await expect(page.getByText("Seller Dashboard")).toBeVisible();
});

test("admin kill switch is reflected in the seller creation flow", async ({ page }) => {
  await seedSellerProfile(page);
  await updateAdminAiSettings(page, true);

  await page.goto("/sell/products/new");
  await syncAdminAiSettings(page);

  await expect(page.getByText("Product creation")).toBeVisible();
  await expect(
    page.getByText(
      "AI is currently paused by admin controls. You can still finish the listing details, but the standards scan is disabled until AI is turned back on.",
    ),
  ).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await updateAdminAiSettings(page, false);
});

test("seller can create a draft listing and save an edit from the dashboard", async ({ page }) => {
  test.slow();
  await seedSellerProfile(page, {
    email: `avery-create-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-create-${Date.now()}`,
  });
  await updateAdminAiSettings(page, false);
  await switchViewerRole(page, "seller");

  const createdTitle = `Seller flow resource ${Date.now()}`;
  const updatedTitle = `${createdTitle} updated`;

  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await expect(page.getByTestId("seller-dashboard-create-product")).toHaveAttribute(
    "href",
    "/sell/products/new",
  );
  await page.goto("/sell/products/new", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/sell\/products\/new$/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("seller-creator-title")).toBeVisible();

  await page.getByTestId("seller-creator-title").fill(createdTitle);
  await page.getByTestId("seller-creator-status").selectOption("Draft");
  await page
    .getByTestId("seller-creator-short-description")
    .fill("Short seller flow summary.");
  await page
    .getByTestId("seller-creator-full-description")
    .fill("Full seller flow description with buyer-facing trust details.");
  await page
    .getByTestId("seller-creator-notes")
    .fill("Seller notes for the first version of this draft.");
  await page.getByTestId("seller-creator-preview-included").check();
  await page.getByTestId("seller-creator-thumbnail-included").check();
  await page.getByTestId("seller-creator-rights-confirmed").check();
  await expect(page.getByTestId("seller-creator-title")).toHaveValue(createdTitle);
  await expect(page.getByTestId("seller-creator-notes")).toHaveValue(
    "Seller notes for the first version of this draft.",
  );
  await expect(page.getByTestId("seller-creator-save")).toBeEnabled({ timeout: 15000 });
  await page.getByTestId("seller-creator-save").click();

  await expect(page.getByTestId("seller-creator-title")).toHaveValue("");
  await expect(page.getByTestId("seller-creator-notes")).toHaveValue("");
  await expect(page.getByTestId("seller-creator-save")).toContainText("Save product");

  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  const createdCard = page
    .locator('[data-testid^="seller-dashboard-resource-"]')
    .filter({ hasText: createdTitle })
    .first();
  await expect(createdCard).toBeVisible();
  await createdCard.getByRole("link", { name: "Edit listing" }).click();

  await expect(page).toHaveURL(/\/sell\/products\/.+\/edit$/);
  await waitForSellerEditor(page);

  await page.getByTestId("seller-editor-title").fill(updatedTitle);
  await page
    .getByTestId("seller-editor-notes")
    .fill("Updated seller notes after remediation.");
  await page.getByTestId("seller-editor-save-draft").click();

  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await waitForSellerDashboard(page);
  await expect(
    page
      .locator('[data-testid^="seller-dashboard-resource-"]')
      .filter({ hasText: updatedTitle })
      .first(),
  ).toBeVisible();
});

test("seller can fix a flagged asset-blocked listing and resubmit it from the dashboard", async ({
  page,
}) => {
  test.slow();
  const profile = await seedSellerProfile(page, {
    email: `avery-flagged-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-flagged-${Date.now()}`,
  });
  await updateAdminAiSettings(page, false);
  await switchViewerRole(page, "seller");

  const flaggedTitle = `Flagged seller listing ${Date.now()}`;
  const flaggedProduct = {
    id: `flagged-${Date.now()}`,
    title: flaggedTitle,
    subject: "Math",
    gradeBand: "6-8",
    standardsTag: "CCSS.MATH.CONTENT.6.RP.A.3",
    updatedAt: "Flagged just now",
    format: "PDF Resource",
    summary: "Flagged listing waiting for seller remediation.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "A flagged listing for remediation testing.",
    fullDescription:
      "A flagged listing with a missing preview so the seller can fix and resubmit it.",
    licenseType: "Single classroom",
    previewIncluded: false,
    thumbnailIncluded: true,
    rightsConfirmed: true,
    sellerName: profile.displayName,
    sellerHandle: `@${profile.storeHandle}`,
    sellerId: profile.email,
    sellerStripeAccountId: "acct_demo_seller",
    priceCents: 1200,
    isPurchasable: false,
    productStatus: "Flagged",
    moderationFeedback: "Add buyer preview pages before this listing can go back into review.",
    createdPath: "Manual upload",
    fileTypes: ["PDF"],
    includedItems: ["Teacher-facing guide", "Student resource pages"],
  };

  const seedPayload = await requestJson<{ product: { id: string } }>(
    page,
    "/api/lessonforge/products",
    {
      method: "POST",
      body: {
        product: flaggedProduct,
      },
    },
  );

  expect(seedPayload.ok).toBeTruthy();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await seedUploadedResource(page, flaggedProduct);
  const productId = flaggedProduct.id;
  expect(productId).toBeTruthy();

  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await page.getByTestId("seller-dashboard-filter-asset-blocked").click();

  const flaggedCard = page.getByTestId(`seller-dashboard-resource-${productId}`);
  await expect(flaggedCard).toBeVisible({ timeout: 15000 });
  await expect(flaggedCard).toContainText(flaggedTitle);
  await expect(flaggedCard).toContainText("Needs preview");
  await expect(flaggedCard).toContainText("Action needed");
  await expect(
    flaggedCard.getByTestId(`seller-dashboard-filter-reason-${productId}`),
  ).toContainText("blocked by asset readiness issues");
  await expect(
    flaggedCard.getByTestId(`seller-dashboard-resubmit-${productId}`),
  ).toHaveAttribute("href", new RegExp(`/sell/products/${productId}/edit\\?focus=preview$`));
  await flaggedCard.getByTestId(`seller-dashboard-resubmit-${productId}`).click();

  await expect(page).toHaveURL(new RegExp(`/sell/products/${productId}/edit\\?focus=preview$`));
  await waitForSellerEditor(page);
  await expect(page.getByTestId("seller-editor-focus-banner")).toContainText(
    "Focus next fix: Preview pages ready",
  );
  await expect(page.getByTestId("seller-editor-preview-section")).toBeVisible();
  await expect(page.getByTestId("seller-editor-progress-preview")).toContainText(
    "Still blocking review",
  );
  await expect(page.getByTestId("seller-editor-live-progress")).toContainText("Needs preview");
  await expect(page.getByRole("heading", { name: "Moderation feedback" })).toBeVisible();
  await expect(page.getByTestId("seller-editor-guidance")).toContainText(
    "Add buyer preview pages before this listing can go back into review.",
  );

  await page.getByTestId("seller-editor-preview-included").check();
  await expect(page.getByTestId("seller-editor-preview-included")).toBeChecked();
  await page.getByTestId("seller-editor-save-resubmit").click();

  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await waitForSellerDashboard(page);

  const resubmittedCard = page.getByTestId(`seller-dashboard-resource-${productId}`);
  await expect(resubmittedCard).toBeVisible();
  await expect(resubmittedCard).toContainText(flaggedTitle);
  await expect(resubmittedCard).toContainText("Pending review");
  await expect(resubmittedCard).toContainText("Ready to publish");
  await expect(
    resubmittedCard.getByTestId(`seller-dashboard-resubmit-${productId}`),
  ).toHaveCount(0);
});

test("admin moderation changes appear in seller recovery flow", async ({ page }) => {
  test.slow();
  const profile = await seedSellerProfile(page, {
    email: `avery-moderation-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-moderation-${Date.now()}`,
  });
  await updateAdminAiSettings(page, false);
  await switchViewerRole(page, "seller");

  const moderationTitle = `Admin flagged listing ${Date.now()}`;
  const moderationProduct = {
    id: `moderation-${Date.now()}`,
    title: moderationTitle,
    subject: "Math",
    gradeBand: "6-8",
    standardsTag: "CCSS.MATH.CONTENT.6.EE.B.5",
    updatedAt: "Pending review just now",
    format: "PDF Resource",
    summary: "Pending review listing for admin moderation handoff testing.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "A pending review listing for admin moderation testing.",
    fullDescription:
      "A pending review listing that should become seller-visible after admin moderation.",
    licenseType: "Single classroom",
    previewIncluded: true,
    thumbnailIncluded: true,
    rightsConfirmed: true,
    sellerName: profile.displayName,
    sellerHandle: `@${profile.storeHandle}`,
    sellerId: profile.email,
    sellerStripeAccountId: "acct_demo_seller",
    priceCents: 1200,
    isPurchasable: false,
    productStatus: "Pending review",
    createdPath: "Manual upload",
    fileTypes: ["PDF"],
    includedItems: ["Teacher-facing guide", "Student resource pages"],
  };

  const seedPayload = await requestJson<{ product: { id: string } }>(
    page,
    "/api/lessonforge/products",
    {
      method: "POST",
      body: {
        product: moderationProduct,
      },
    },
  );

  expect(seedPayload.ok).toBeTruthy();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await seedUploadedResource(page, moderationProduct);
  const productId = moderationProduct.id;
  expect(productId).toBeTruthy();

  await switchViewerRole(page, "admin");
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await waitForAdminDashboard(page);

  const adminProductCard = page.getByTestId(`admin-product-${productId}`);
  await expect(adminProductCard).toBeVisible();
  await adminProductCard
    .getByTestId(`admin-product-note-${productId}`)
    .fill("Preview pages need to be refreshed before this listing can go back into review.");
  await expect(adminProductCard.getByTestId(`admin-product-note-${productId}`)).toHaveValue(
    "Preview pages need to be refreshed before this listing can go back into review.",
  );
  const moderationResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/lessonforge/products") &&
      response.request().method() === "PATCH",
  );
  await adminProductCard
    .getByTestId(`admin-product-status-${productId}-flagged`)
    .click();
  const moderationResponse = await moderationResponsePromise;
  expect(moderationResponse.ok()).toBeTruthy();
  const moderationPayload = (await moderationResponse.json()) as {
    product?: ProductRecord;
    error?: string;
  };
  expect(moderationPayload.product?.productStatus).toBe("Flagged");
  expect(moderationPayload.product?.moderationFeedback).toBe(
    "Preview pages need to be refreshed before this listing can go back into review.",
  );
  await expect
    .poll(async () => {
      const productsPayload = await requestJson<{ products?: ProductRecord[] }>(
        page,
        "/api/lessonforge/products",
      );
      return productsPayload.body.products?.find((product) => product.id === productId)
        ?.productStatus;
    })
    .toBe("Flagged");

  await switchViewerRole(page, "seller");
  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await page.getByTestId("seller-dashboard-filter-needs-action").click();

  const sellerRecoveryCard = page.getByTestId(`seller-dashboard-resource-${productId}`);
  await expect(sellerRecoveryCard).toBeVisible({ timeout: 15000 });
  await expect(sellerRecoveryCard).toContainText(moderationTitle);
  await expect(sellerRecoveryCard).toContainText("Action needed");
  await expect(
    sellerRecoveryCard.getByTestId(`seller-dashboard-filter-reason-${productId}`),
  ).toContainText("needs seller changes before it can safely move forward again");
  await expect(sellerRecoveryCard).toContainText(
    "Preview pages need to be refreshed before this listing can go back into review.",
  );
  await expect(
    sellerRecoveryCard.getByTestId(`seller-dashboard-guidance-${productId}`),
  ).toContainText("Flagged listings can go back into review as soon as the blocking issues are fixed.");
  await expect(
    sellerRecoveryCard.getByTestId(`seller-dashboard-guidance-${productId}`),
  ).toContainText("Preview pages need to be refreshed before this listing can go back into review.");
  await expect(
    sellerRecoveryCard.getByTestId(`seller-dashboard-resubmit-${productId}`),
  ).toHaveAttribute("href", new RegExp(`/sell/products/${productId}/edit\\?focus=details$`));
  await sellerRecoveryCard.getByTestId(`seller-dashboard-resubmit-${productId}`).click();

  await expect(page).toHaveURL(new RegExp(`/sell/products/${productId}/edit\\?focus=details$`));
  await waitForSellerEditor(page);
  await expect(page.getByTestId("seller-editor-focus-banner")).toContainText(
    "Focus next fix: Listing details",
  );
  await expect(page.getByTestId("seller-editor-live-progress")).toContainText("Ready to publish");
  await expect(page.getByRole("heading", { name: "Moderation feedback" })).toBeVisible();
  await expect(page.getByTestId("seller-editor-guidance")).toContainText(
    "Flagged listings can go back into review as soon as the blocking issues are fixed.",
  );
  await expect(page.getByTestId("seller-editor-guidance")).toContainText(
    "Preview pages need to be refreshed before this listing can go back into review.",
  );

  await page.getByTestId("seller-editor-notes").fill(
    "Updated seller notes after admin moderation feedback.",
  );
  await page.getByTestId("seller-editor-save-resubmit").click();

  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await waitForSellerDashboard(page);

  const resolvedCard = page.getByTestId(`seller-dashboard-resource-${productId}`);
  await expect(resolvedCard).toBeVisible();
  await expect(resolvedCard).toContainText("Pending review");
  await expect(
    resolvedCard.getByTestId(`seller-dashboard-resubmit-${productId}`),
  ).toHaveCount(0);
});

test("rejected listings stay recoverable while removed listings do not", async ({ page }) => {
  test.slow();
  const profile = await seedSellerProfile(page, {
    email: `avery-review-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-review-${Date.now()}`,
  });
  await updateAdminAiSettings(page, false);
  await switchViewerRole(page, "seller");

  const rejectedTitle = `Rejected seller listing ${Date.now()}`;
  const removedTitle = `Removed seller listing ${Date.now()}`;
  const rejectedProduct = {
    id: `rejected-${Date.now()}`,
    title: rejectedTitle,
    subject: "Math",
    gradeBand: "6-8",
    standardsTag: "CCSS.MATH.CONTENT.6.NS.B.3",
    updatedAt: "Rejected just now",
    format: "PDF Resource",
    summary: "Rejected listing still available for seller recovery.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "Rejected listing for seller recovery coverage.",
    fullDescription:
      "Rejected listing with seller-facing guidance that should still support resubmission.",
    licenseType: "Single classroom",
    previewIncluded: true,
    thumbnailIncluded: true,
    rightsConfirmed: true,
    sellerName: profile.displayName,
    sellerHandle: `@${profile.storeHandle}`,
    sellerId: profile.email,
    sellerStripeAccountId: "acct_demo_seller",
    priceCents: 1200,
    isPurchasable: false,
    productStatus: "Rejected",
    moderationFeedback:
      "Tighten the buyer-facing explanation before resubmitting this listing.",
    createdPath: "Manual upload",
    fileTypes: ["PDF"],
    includedItems: ["Teacher-facing guide", "Student resource pages"],
  };
  const removedProduct = {
    id: `removed-${Date.now()}`,
    title: removedTitle,
    subject: "Math",
    gradeBand: "6-8",
    standardsTag: "CCSS.MATH.CONTENT.6.NS.C.5",
    updatedAt: "Removed just now",
    format: "PDF Resource",
    summary: "Removed listing that should not stay seller-editable.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "Removed listing for seller access coverage.",
    fullDescription:
      "Removed listing that should no longer expose a seller remediation path.",
    licenseType: "Single classroom",
    previewIncluded: true,
    thumbnailIncluded: true,
    rightsConfirmed: true,
    sellerName: profile.displayName,
    sellerHandle: `@${profile.storeHandle}`,
    sellerId: profile.email,
    sellerStripeAccountId: "acct_demo_seller",
    priceCents: 1200,
    isPurchasable: false,
    productStatus: "Removed",
    moderationFeedback:
      "This listing was removed from circulation and is no longer available for seller edits.",
    createdPath: "Manual upload",
    fileTypes: ["PDF"],
    includedItems: ["Teacher-facing guide", "Student resource pages"],
  };

  const seedProducts = await Promise.all([
    requestJson<{ product: { id: string } }>(page, "/api/lessonforge/products", {
      method: "POST",
      body: {
        product: rejectedProduct,
      },
    }),
    requestJson<{ product: { id: string } }>(page, "/api/lessonforge/products", {
      method: "POST",
      body: {
        product: removedProduct,
      },
    }),
  ]);

  expect(seedProducts[0].ok).toBeTruthy();
  expect(seedProducts[1].ok).toBeTruthy();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await seedUploadedResource(page, rejectedProduct);
  await seedUploadedResource(page, removedProduct);

  const rejectedId = rejectedProduct.id;
  const removedId = removedProduct.id;

  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await page.getByTestId("seller-dashboard-filter-needs-action").click();

  const rejectedCard = page.getByTestId(`seller-dashboard-resource-${rejectedId}`);
  await expect(rejectedCard).toBeVisible({ timeout: 15000 });
  await expect(rejectedCard).toContainText(rejectedTitle);
  await expect(rejectedCard).toContainText("Action needed");
  await expect(rejectedCard).toContainText(
    "Tighten the buyer-facing explanation before resubmitting this listing.",
  );
  await expect(
    rejectedCard.getByTestId(`seller-dashboard-guidance-${rejectedId}`),
  ).toContainText("Rejected listings need a stronger revision before they can return to review.");
  await expect(
    rejectedCard.getByTestId(`seller-dashboard-resubmit-${rejectedId}`),
  ).toHaveAttribute("href", new RegExp(`/sell/products/${rejectedId}/edit\\?focus=details$`));
  const rejectedRecoveryHref = await rejectedCard
    .getByTestId(`seller-dashboard-resubmit-${rejectedId}`)
    .getAttribute("href");
  expect(rejectedRecoveryHref).toBeTruthy();
  await page.goto(rejectedRecoveryHref!, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(new RegExp(`/sell/products/${rejectedId}/edit\\?focus=details$`));
  await waitForSellerEditor(page);
  await expect(page.getByTestId("seller-editor-focus-banner")).toContainText(
    "Focus next fix: Listing details",
  );
  await expect(page.getByTestId("seller-editor-live-progress")).toContainText("Ready to publish");
  await expect(page.getByTestId("seller-editor-guidance")).toContainText(
    "Rejected listings need a stronger revision before they can return to review.",
  );
  await expect(page.getByRole("heading", { name: "Moderation feedback" })).toBeVisible();
  await expect(page.getByTestId("seller-editor-guidance")).toContainText(
    "Tighten the buyer-facing explanation before resubmitting this listing.",
  );
  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);

  const removedCard = page.getByTestId(`seller-dashboard-resource-${removedId}`);
  await expect(removedCard).toBeVisible();
  await expect(removedCard).toContainText(removedTitle);
  await expect(
    removedCard.getByTestId(`seller-dashboard-removed-note-${removedId}`),
  ).toContainText("Removed listings can no longer be edited or resubmitted");
  await expect(removedCard.getByTestId(`seller-dashboard-edit-${removedId}`)).toHaveCount(0);
  await expect(removedCard.getByTestId(`seller-dashboard-resubmit-${removedId}`)).toHaveCount(0);

  await page.goto(`/sell/products/${removedId}/edit`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("seller-removed-product-headline")).toBeVisible();
  await expect(page.getByTestId("seller-removed-product-note")).toContainText(
    "Removed listings are out of circulation entirely.",
  );
});

test("seller dashboard filters persist in the URL and clear back to the full view", async ({
  page,
}) => {
  await seedSellerProfile(page, {
    email: `avery-dashboard-filter-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-dashboard-filter-${Date.now()}`,
  });
  await switchViewerRole(page, "seller");

  await page.goto("/sell/dashboard", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText("All listings");

  await page.getByTestId("seller-dashboard-filter-needs-action").click();
  await expect(page).toHaveURL(/\/sell\/dashboard\?view=needs-action$/);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText(
    "Needs action mode",
  );
  await expect(page.getByTestId("seller-dashboard-filter-summary")).toContainText(
    "needing seller attention",
  );
  await expect(page.getByTestId("seller-dashboard-mode-stat-recovery")).toContainText(
    "Flagged or rejected",
  );
  await expect(page.getByTestId("seller-dashboard-batch-guidance")).toContainText(
    "attention-focused view",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await expect(page).toHaveURL(/\/sell\/dashboard\?view=needs-action$/);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText(
    "Needs action mode",
  );
  await expect(page.getByTestId("seller-dashboard-filter-summary")).toContainText(
    "needing seller attention",
  );
  await expect(page.getByTestId("seller-dashboard-mode-stat-recovery")).toContainText(
    "Flagged or rejected",
  );
  await expect(page.getByTestId("seller-dashboard-batch-guidance")).toContainText(
    "attention-focused view",
  );

  await page.getByTestId("seller-dashboard-clear-filter").click();
  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText("All listings");
  await expect(page.getByTestId("seller-dashboard-filter-summary")).toContainText(
    "across your full catalog",
  );
  await expect(page.getByTestId("seller-dashboard-mode-stat-preview")).toContainText(
    "Missing preview",
  );
});

test("seller dashboard filtered empty states explain the mode clearly", async ({ page }) => {
  await seedSellerProfile(page, {
    email: `avery-dashboard-empty-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-dashboard-empty-${Date.now()}`,
  });
  await switchViewerRole(page, "seller");

  await page.goto("/sell/dashboard?view=top-performers", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText(
    "Strong listings mode",
  );
  await expect(page.getByTestId("seller-dashboard-empty-state")).toContainText(
    "No uploaded resources yet",
  );
  await expect(page.getByTestId("seller-dashboard-empty-state")).toContainText(
    "Create your first listing",
  );
  await expect(page.getByTestId("seller-dashboard-empty-state-action")).toContainText(
    "Create product",
  );
  await expect(page.getByTestId("seller-dashboard-empty-state-action")).toHaveAttribute(
    "href",
    "/sell/products/new",
  );
});

test("seller dashboard filtered empty states can recover back to all listings", async ({
  page,
}) => {
  const profile = await seedSellerProfile(page, {
    email: `avery-dashboard-recover-${Date.now()}@lessonforge.demo`,
    storeHandle: `avery-dashboard-recover-${Date.now()}`,
  });
  await switchViewerRole(page, "seller");

  const draftTitle = `Dashboard recovery draft ${Date.now()}`;
  const draftProduct = {
    id: `dashboard-recovery-${Date.now()}`,
    title: draftTitle,
    subject: "Math",
    gradeBand: "3-5",
    standardsTag: "CCSS.MATH.CONTENT.4.NF.B.3",
    updatedAt: "Draft just now",
    format: "PDF Resource",
    summary: "Draft listing used to verify seller dashboard empty-state recovery.",
    demoOnly: false,
    resourceType: "Worksheet",
    shortDescription: "Draft listing for seller dashboard recovery coverage.",
    fullDescription: "A draft listing that should appear in all listings but not in top performers.",
    licenseType: "Single classroom",
    previewIncluded: false,
    thumbnailIncluded: false,
    rightsConfirmed: false,
    sellerName: profile.displayName,
    sellerHandle: `@${profile.storeHandle}`,
    sellerId: profile.email,
    sellerStripeAccountId: "acct_demo_seller",
    priceCents: 900,
    isPurchasable: false,
    productStatus: "Draft",
    createdPath: "Manual upload",
    fileTypes: ["PDF"],
    includedItems: ["Practice pages"],
  };

  const seedPayload = await requestJson<{ product: { id: string } }>(
    page,
    "/api/lessonforge/products",
    {
      method: "POST",
      body: {
        product: draftProduct,
      },
    },
  );

  expect(seedPayload.ok).toBeTruthy();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await seedUploadedResource(page, draftProduct);

  await page.goto("/sell/dashboard?view=top-performers", { waitUntil: "domcontentloaded" });
  await waitForSellerDashboard(page);
  await expect(page.getByTestId("seller-dashboard-empty-state")).toContainText(
    "No top performers in this view yet",
  );
  await expect(page.getByTestId("seller-dashboard-empty-state-action")).toContainText(
    "View all listings",
  );

  await page.getByTestId("seller-dashboard-empty-state-action").click();
  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await expect(page.getByTestId("seller-dashboard-active-filter")).toContainText("All listings");
  await expect(page.getByTestId(`seller-dashboard-resource-${draftProduct.id}`)).toContainText(
    draftTitle,
  );
});

test("buyer marketplace clicks reach the expected product, preview, store, and checkout flows", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  const listingHref = "/marketplace/math-intervention-studio";
  await page.evaluate(async () => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };
    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === "math-intervention-5",
    );

    if (alreadySaved) {
      await fetch("/api/lessonforge/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: "math-intervention-5" }),
      });
    }
  });
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main h1")).toBeVisible();

  const saveButton = page.getByTestId("product-favorite-math-intervention-5");
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  await expect(page).toHaveURL(
    /\/marketplace\/math-intervention-studio(?:\?returnTo=%2Fmarketplace)?$/,
  );

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("favorite-view-math-intervention-5")).toBeVisible();
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });

  const previewLink = page.getByRole("link", { name: "Open cached preview" }).first();
  await expect(previewLink).toBeVisible();
  const previewPopupPromise = context.waitForEvent("page");
  await previewLink.click();
  const previewPopup = await previewPopupPromise;
  await previewPopup.waitForLoadState("domcontentloaded");
  await expect(previewPopup).toHaveURL(/\/api\/lessonforge\/preview-assets\//);
  await previewPopup.close();

  await page.getByRole("link", { name: "Visit storefront" }).click();
  await expect(page).toHaveURL(/\/store\//);

  await page.goto(listingHref, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`${listingHref}$`));

  await page.locator('a[href^="/checkout-preview?"]').first().click();
  await expect(page).toHaveURL(/\/checkout-preview\?/);
  await expect(page.getByTestId("checkout-cancel-link")).toHaveText(
    "Cancel and return to product",
  );

  await page.getByTestId("checkout-cancel-link").click();
  await expect(page).toHaveURL(
    /\/marketplace\/math-intervention-studio(?:\?returnTo=%2Fmarketplace)?$/,
  );

  await page.getByRole("link", { name: "Back to marketplace" }).click();
  await expect(page).toHaveURL(/\/marketplace$/);

  await page.goto("/marketplace?q=fractions&trust=asset-ready", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/marketplace\?q=fractions&trust=asset-ready$/);
  await page.goto(
    "/marketplace/math-intervention-studio?returnTo=%2Fmarketplace%3Fq%3Dfractions%26trust%3Dasset-ready",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByTestId("product-back-marketplace")).toHaveText("Back to marketplace");
  await expect(page.getByTestId("related-return-action")).toHaveText("Browse all resources");
  await page.getByTestId("product-back-marketplace").click();
  await expect(page).toHaveURL(/\/marketplace\?q=fractions&trust=asset-ready$/);
  await page.goto("/marketplace?q=fractions&trust=asset-ready", {
    waitUntil: "domcontentloaded",
  });

  const marketplaceSaveButton = page.getByTestId("product-card-favorite-math-intervention-5").first();
  await expect(marketplaceSaveButton).toBeVisible();
  await marketplaceSaveButton.click();
  await expect(page).toHaveURL(/\/marketplace\?q=fractions&trust=asset-ready$/);
});

test("buyer storefront and related-product continuity stays clickable", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  const listingHref = "/marketplace/math-intervention-studio";
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });

  await page.getByTestId("product-visit-storefront").click();
  await expect(page).toHaveURL(/\/store\//);
  await expect(page.getByText("Seller storefront")).toBeVisible();

  const firstStoreProduct = page.locator('[data-testid^="storefront-product-"]').first();
  await expect(firstStoreProduct).toBeVisible();
  const firstStoreProductLink = firstStoreProduct.locator('a[href^="/marketplace/"]').first();
  const storeProductHref = await firstStoreProductLink.getAttribute("href");
  expect(storeProductHref).toBeTruthy();
  await firstStoreProductLink.click();
  await expect(page).toHaveURL(new RegExp(`${storeProductHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.getByTestId("product-visit-storefront")).toHaveText("Return to storefront");
  await expect(page.getByTestId("product-back-marketplace")).toHaveText("Back to storefront");
  await expect(page.getByTestId("related-return-action")).toHaveText("Return to storefront");
  await expect(page.getByTestId("related-explore-seller-store")).toHaveText("Return to storefront");
  await page.getByTestId("product-back-marketplace").click();
  await expect(page).toHaveURL(/\/store\//);
  await page.goto(storeProductHref!, { waitUntil: "domcontentloaded" });

  const relatedCard = page.locator('[data-testid^="related-product-"]').first();
  await expect(relatedCard).toBeVisible();
  const relatedHref = await relatedCard.getAttribute("href");
  expect(relatedHref).toBeTruthy();
  await relatedCard.click();
  await expect(page).toHaveURL(new RegExp(`${relatedHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await page.getByTestId("product-back-marketplace").click();
  await expect(page).toHaveURL(new RegExp(`${storeProductHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await page.goto(relatedHref!, { waitUntil: "domcontentloaded" });

  await page.getByTestId("related-explore-seller-store").click();
  await expect(page).toHaveURL(/\/store\//);

  await page.getByTestId("storefront-compare-all").click();
  await expect(page).toHaveURL(/\/marketplace$/);
});

test("buyer favorites compare actions and empty-state recovery stay clickable", async ({
  page,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  const listingHref = "/marketplace/math-intervention-studio";
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });

  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();
  const checkoutUrl = new URL(checkoutHref!, "http://localhost:3000");
  const productId = checkoutUrl.searchParams.get("productId");
  expect(productId).toBeTruthy();

  const favoriteStatus = await page.evaluate(async (nextProductId) => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === nextProductId,
    );

    if (alreadySaved) {
      return { ok: true, favorited: true };
    }

    const response = await fetch("/api/lessonforge/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: nextProductId }),
    });

    const payload = (await response.json()) as { favorited?: boolean };

    return {
      ok: response.ok,
      favorited: payload.favorited ?? false,
    };
  }, productId);
  expect(favoriteStatus.ok).toBeTruthy();
  expect(favoriteStatus.favorited).toBe(true);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Compare saved listings before you buy/i }),
  ).toBeVisible();
  await expect(page.getByText("Quick decision guide")).toBeVisible();
  await expect(page.getByText("Comparison view")).toBeVisible();

  await page.getByTestId(`favorite-view-${productId}`).click();
  await expect(page).toHaveURL(/\/marketplace\/.+\?returnTo=%2Ffavorites$/);
  await expect(page.getByTestId("product-back-marketplace")).toHaveText("Back to shortlist");
  await expect(page.getByTestId("related-return-action")).toHaveText("Return to shortlist");
  await page.getByTestId("product-back-marketplace").click();
  await expect(page).toHaveURL(/\/favorites$/);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await page.getByTestId(`favorite-buy-${productId}`).click();
  await expect(page).toHaveURL(/\/checkout-preview\?/);
  await expect(page.getByTestId("checkout-cancel-link")).toHaveText(
    "Cancel and return to shortlist",
  );
  await page.getByTestId("checkout-cancel-link").click();
  await expect(page).toHaveURL(/\/favorites$/);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  const removeButton = page.getByTestId(`favorite-remove-${productId}`);
  await expect(removeButton).toBeVisible();
  await expect(removeButton).toBeEnabled({ timeout: 20000 });
  await Promise.all([
    page.waitForURL(/\/favorites$/),
    removeButton.click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId(`favorite-remove-${productId}`)).toHaveCount(0);
  const browseMarketplaceLink = page.getByTestId("favorites-empty-browse-marketplace");
  await expect(browseMarketplaceLink).toBeVisible();
  await browseMarketplaceLink.click();
  await expect(page).toHaveURL(/\/marketplace$/);
});

test("empty shortlist points buyers to the library when purchases already exist", async ({
  page,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  const listingHref = "/marketplace/math-intervention-studio";
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });

  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();
  const checkoutUrl = new URL(checkoutHref!, "http://localhost:3000");
  const productId = checkoutUrl.searchParams.get("productId");
  expect(productId).toBeTruthy();

  const favoriteStatus = await page.evaluate(async (nextProductId) => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === nextProductId,
    );

    if (alreadySaved) {
      return { ok: true, favorited: true };
    }

    const response = await fetch("/api/lessonforge/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: nextProductId }),
    });

    const payload = (await response.json()) as { favorited?: boolean };

    return {
      ok: response.ok,
      favorited: payload.favorited ?? false,
    };
  }, productId);
  expect(favoriteStatus.ok).toBeTruthy();
  expect(favoriteStatus.favorited).toBe(true);

  await page.goto(checkoutHref!, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Complete demo purchase" }).click();
  await expect(page).toHaveURL(/\/library(?:\?|$)/);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await Promise.all([
    page.waitForURL(/\/favorites$/),
    page.getByTestId(`favorite-remove-${productId}`).click(),
  ]);
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId(`favorite-remove-${productId}`)).toHaveCount(0);
  await expect(page.getByTestId("favorites-empty-library-note")).toContainText(
    "purchased resource",
  );
  const libraryLink = page.getByTestId("favorites-empty-view-library");
  await expect(libraryLink).toContainText(/View library \(\d+ purchased\)/);
  await libraryLink.click();
  await expect(page).toHaveURL(/\/library(?:\?|$)/);
});

test("shortlist compare modes persist in the URL and clear back to the full view", async ({
  page,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace/math-intervention-studio", { waitUntil: "domcontentloaded" });

  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();
  const checkoutUrl = new URL(checkoutHref!, "http://localhost:3000");
  const productId = checkoutUrl.searchParams.get("productId");
  expect(productId).toBeTruthy();

  const favoriteStatus = await page.evaluate(async (nextProductId) => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === nextProductId,
    );

    if (alreadySaved) {
      return { ok: true, favorited: true };
    }

    const response = await fetch("/api/lessonforge/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: nextProductId }),
    });

    const payload = (await response.json()) as { favorited?: boolean };

    return {
      ok: response.ok,
      favorited: payload.favorited ?? false,
    };
  }, productId);
  expect(favoriteStatus.ok).toBeTruthy();
  expect(favoriteStatus.favorited).toBe(true);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("favorites-active-mode-pill")).toContainText(
    /All saved listings/i,
  );

  await page.getByTestId("favorites-mode-updated").click();
  await expect(page).toHaveURL(/\/favorites\?mode=updated$/);
  await expect(page.getByTestId("favorites-active-mode-pill")).toContainText(
    /Updated mode/i,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/favorites\?mode=updated$/);
  await expect(page.getByTestId("favorites-active-mode-pill")).toContainText(
    /Updated mode/i,
  );

  await page.getByTestId("favorites-clear-mode").click();
  await expect(page).toHaveURL(/\/favorites$/);
  await expect(page.getByTestId("favorites-active-mode-pill")).toContainText(
    /All saved listings/i,
  );
});

test("shortlist featured card explains why it is surfaced in updated mode", async ({
  page,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace/math-intervention-studio", { waitUntil: "domcontentloaded" });
  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();
  const checkoutUrl = new URL(checkoutHref!, "http://localhost:3000");
  const productId = checkoutUrl.searchParams.get("productId");
  expect(productId).toBeTruthy();

  const favoriteStatus = await page.evaluate(async (nextProductId) => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === nextProductId,
    );

    if (alreadySaved) {
      return { ok: true, favorited: true };
    }

    const response = await fetch("/api/lessonforge/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: nextProductId }),
    });

    const payload = (await response.json()) as { favorited?: boolean };

    return {
      ok: response.ok,
      favorited: payload.favorited ?? false,
    };
  }, productId);
  expect(favoriteStatus.ok).toBeTruthy();
  expect(favoriteStatus.favorited).toBe(true);

  await page.goto("/favorites?mode=updated", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("favorites-active-mode-pill")).toContainText(
    /Updated mode/i,
  );
  await expect(page.getByTestId("favorites-featured-mode-reason")).toContainText(
    /Updated mode/i,
  );
});

test("buyer shortlist and library actions stay clickable through purchase and protected delivery", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  const listingHref = "/marketplace/math-intervention-studio";
  await page.goto(listingHref, { waitUntil: "domcontentloaded" });

  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();
  const checkoutUrl = new URL(checkoutHref!, "http://localhost:3000");
  const productId = checkoutUrl.searchParams.get("productId");
  expect(productId).toBeTruthy();

  const favoriteStatus = await page.evaluate(async (nextProductId) => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === nextProductId,
    );

    if (alreadySaved) {
      return { ok: true, favorited: true };
    }

    const response = await fetch("/api/lessonforge/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: nextProductId }),
    });

    const payload = (await response.json()) as { favorited?: boolean };

    return {
      ok: response.ok,
      favorited: payload.favorited ?? false,
    };
  }, productId);
  expect(favoriteStatus.ok).toBeTruthy();
  expect(favoriteStatus.favorited).toBe(true);

  const saveButton = page.getByRole("button", { name: /Save to shortlist|Saved/ });
  await expect(saveButton).toBeVisible();
  await expect(saveButton).toContainText(/Saved|Save to shortlist/);

  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Your shortlist before you buy/i })).toBeVisible();

  const shortlistBuyLink = page.locator('a[href^="/checkout-preview?"]').first();
  await expect(shortlistBuyLink).toBeVisible();
  await shortlistBuyLink.click();
  await expect(page).toHaveURL(/\/checkout-preview\?/);

  await page.getByRole("button", { name: /Confirm purchase|Complete demo purchase|Completing purchase/ }).click();
  const finalConfirm = page.getByRole("button", { name: /Yes, continue purchase/i });
  if (await finalConfirm.isVisible().catch(() => false)) {
    await finalConfirm.click();
  }
  await expect(page).toHaveURL(/\/library(?:\?|$)/);
  await expect(
    page.getByRole("heading", {
      name: /Your files, updates, and support in one library/i,
    }),
  ).toBeVisible();

  const libraryCard = page.locator('[data-testid^="library-item-"]').first();
  await expect(libraryCard).toBeVisible();
  const libraryId = await libraryCard.getAttribute("data-testid");
  expect(libraryId).toBeTruthy();
  const orderId = libraryId!.replace("library-item-", "");

  const linkedAssetPopupPromise = context.waitForEvent("page");
  await page.getByTestId(`library-open-linked-asset-${orderId}`).click();
  const linkedAssetPopup = await linkedAssetPopupPromise;
  await linkedAssetPopup.waitForLoadState("domcontentloaded");
  await expect(linkedAssetPopup).toHaveURL(/\/marketplace\/.+\?returnTo=%2Flibrary$/);
  await expect(linkedAssetPopup.getByTestId("product-back-marketplace")).toHaveText(
    "Back to library",
  );
  await expect(linkedAssetPopup.getByTestId("related-return-action")).toHaveText(
    "Return to library",
  );
  await linkedAssetPopup.close();

  const storefrontPopupPromise = context.waitForEvent("page");
  await page.getByTestId(`library-open-storefront-${orderId}`).click();
  const storefrontPopup = await storefrontPopupPromise;
  await storefrontPopup.waitForLoadState("domcontentloaded");
  await expect(storefrontPopup).toHaveURL(/\/store\//);
  await expect(storefrontPopup.getByText("Seller storefront")).toBeVisible();
  await storefrontPopup.close();

  const downloadPopupPromise = context.waitForEvent("page");
  await page.getByTestId(`library-download-${orderId}`).click();
  const downloadPopup = await downloadPopupPromise;
  expect(downloadPopup).toBeTruthy();
  await downloadPopup.close();

});

test("empty library state points buyers back into the marketplace", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.evaluate(async () => {
    const currentResponse = await fetch("/api/lessonforge/favorites");
    const currentPayload = (await currentResponse.json()) as {
      favorites?: Array<{ productId: string }>;
    };

    const alreadySaved = currentPayload.favorites?.some(
      (favorite) => favorite.productId === "math-intervention-5",
    );

    if (!alreadySaved) {
      await fetch("/api/lessonforge/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: "math-intervention-5" }),
      });
    }
  });

  await page.goto("/library", { waitUntil: "domcontentloaded" });

  const libraryItems = page.locator('[data-testid^="library-item-"]');
  if (await libraryItems.count()) {
    return;
  }

  await expect(page.getByTestId("library-empty-shortlist-note")).toContainText(
    "saved item",
  );
  const shortlistLink = page.getByTestId("library-empty-view-shortlist");
  await expect(shortlistLink).toBeVisible();
  await expect(shortlistLink).toContainText("saved");
  await shortlistLink.click();
  await expect(page).toHaveURL(/\/favorites$/);

  await page.goto("/library", { waitUntil: "domcontentloaded" });
  const browseMarketplaceLink = page.getByTestId("library-empty-browse-marketplace");
  await expect(browseMarketplaceLink).toBeVisible();
  await browseMarketplaceLink.click();
  await expect(page).toHaveURL(/\/marketplace$/);
});

test("library filters persist in the URL and survive reloads", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace/math-intervention-studio", { waitUntil: "domcontentloaded" });
  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();

  await page.goto(checkoutHref!, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Complete demo purchase|Completing purchase/ }).click();
  await expect(page).toHaveURL(/\/library$/);

  const firstLibraryItem = page.locator('[data-testid^="library-item-"]').first();
  await expect(firstLibraryItem).toBeVisible();

  const updatedFilter = page.getByTestId("library-filter-updated");
  await updatedFilter.click();
  await expect(page).toHaveURL(/\/library\?view=updated$/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/library\?view=updated$/);
  await expect(page.getByText(/Updated mode/i)).toBeVisible();
  await expect(
    page.getByText(/updated purchase|No updated purchases/i).first(),
  ).toBeVisible();

  const supportFilter = page.getByTestId("library-filter-support");
  await supportFilter.click();
  await expect(page).toHaveURL(/\/library\?view=support$/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/library\?view=support$/);
  await expect(page.getByText(/Support mode/i)).toBeVisible();
  await expect(
    page.getByText(/purchase.*needing attention|No purchases needing support attention/i).first(),
  ).toBeVisible();

  const allFilter = page.getByTestId("library-filter-all");
  await allFilter.click();
  await expect(page).toHaveURL(/\/library$/);
});

test("library clear filter returns buyers to the full library view", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace/math-intervention-studio", { waitUntil: "domcontentloaded" });
  const checkoutHref = await page
    .locator('a[href^="/checkout-preview?"]')
    .first()
    .getAttribute("href");
  expect(checkoutHref).toBeTruthy();

  await page.goto(checkoutHref!, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Complete demo purchase|Completing purchase/ }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.getByTestId("library-filter-updated").click();
  await expect(page).toHaveURL(/\/library\?view=updated$/);
  await expect(page.getByTestId("library-active-filter-pill")).toContainText(
    /Updated purchases/i,
  );

  await page.getByTestId("library-clear-filter").click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByTestId("library-active-filter-pill")).toContainText(
    /All purchases/i,
  );
});

test("marketplace filters and empty-state recovery actions stay clickable", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });

  await page.getByTestId("marketplace-trust-trusted-seller").click();
  await expect(page).toHaveURL(/trust=trusted-seller/);
  await expect(page.getByText("Trust: trusted-seller")).toBeVisible();

  await page.selectOption('select[aria-label="Filter by grade band"]', "6-8");
  await page.selectOption('select[aria-label="Sort marketplace results"]', "recently-updated");
  await page.getByRole("button", { name: "Search marketplace" }).click();
  await expect(page).toHaveURL(/grade=6-8/);
  await expect(page).toHaveURL(/sort=recently-updated/);
  await expect(page.getByText("Grade: 6-8")).toBeVisible();
  await expect(page.getByText("Sort: recently-updated")).toBeVisible();

  await page.goto(
    "/marketplace?q=zzznomatch&subject=Math&trust=asset-ready&grade=6-8&resourceType=Worksheet&price=under-10",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByText("No exact matches yet")).toBeVisible();
  await page.getByTestId("marketplace-empty-drop-trust-filter").click();
  await expect(page).toHaveURL(/\/marketplace\?q=zzznomatch$/);

  await page.goto(
    "/marketplace?q=zzznomatch&subject=Math&trust=asset-ready&grade=6-8&resourceType=Worksheet&price=under-10",
    { waitUntil: "domcontentloaded" },
  );
  await page.getByTestId("marketplace-empty-reset").click();
  await expect(page).toHaveURL(/\/marketplace$/);
});

test("default marketplace subject shelves show distinct buyable examples", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Five preview products in every subject")).toBeVisible();

  const mathShelf = page.getByTestId("marketplace-subject-shelf-math");
  const elaShelf = page.getByTestId("marketplace-subject-shelf-ela");
  const scienceShelf = page.getByTestId("marketplace-subject-shelf-science");
  const socialStudiesShelf = page.getByTestId("marketplace-subject-shelf-social-studies");

  await expect(mathShelf).toBeVisible();
  await expect(elaShelf).toBeVisible();
  await expect(scienceShelf).toBeVisible();
  await expect(socialStudiesShelf).toBeVisible();

  await expect(mathShelf.locator("article")).toHaveCount(5);
  await expect(elaShelf.locator("article")).toHaveCount(5);
  await expect(scienceShelf.locator("article")).toHaveCount(5);
  await expect(socialStudiesShelf.locator("article")).toHaveCount(5);

  const mathTitles = await mathShelf.locator("article h3").allTextContents();
  expect(new Set(mathTitles).size).toBeGreaterThan(1);

  const buyNowLink = mathShelf.getByRole("link", { name: "Buy now" }).first();
  const href = await buyNowLink.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href).toContain("/checkout-preview?");

  const shopMathLink = page.getByTestId("marketplace-subject-shelf-link-math");
  await expect(shopMathLink).toBeVisible();
  await expect(shopMathLink).toHaveText("Shop Math");
  await shopMathLink.click();
  await expect(page).toHaveURL(/\/marketplace\?subject=Math$/);
  await expect(page.getByText("Subject: Math")).toBeVisible();

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  await buyNowLink.click();
  await expect(page).toHaveURL(/\/checkout-preview\?/);
  await expect(page.getByTestId("checkout-cancel-link")).toBeVisible();
});

test("marketplace subject shelves include curator notes for each subject", async ({ page }) => {
  await page.goto("/");
  await switchViewerRole(page, "buyer");

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });

  for (const subject of ["math", "ela", "science", "social-studies"]) {
    const curationPanel = page.getByTestId(`marketplace-subject-curation-${subject}`);
    await expect(curationPanel).toBeVisible();
    await expect(curationPanel).toContainText(/Why this shelf is curated/i);
  }
});

test("owner header badge and admin persistence card reflect cutover status", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await switchViewerRole(page, "owner");

  const ownerReadiness = await fetchPersistenceReadiness(page);
  expect(ownerReadiness.ok).toBeTruthy();
  expect(ownerReadiness.status).toBe(200);
  expect(ownerReadiness.body.cutoverReport.stage).toMatch(
    /preflight-blocked|ready-for-verification|verification-passed|verification-failed/,
  );
  expect(ownerReadiness.body.cutoverReport.stageHeadline).toMatch(
    /Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/,
  );
  expect(ownerReadiness.body.cutoverReport.stageDescription).toMatch(
    /Required database or Prisma setup is still missing|The environment is ready, and the next live step is seller-flow verification|The first strict Prisma seller-flow verification completed successfully|Prisma was reachable, but the live verification still found a persistence-path problem/,
  );
  expect(ownerReadiness.body.cutoverReport.detailLines.length).toBeGreaterThan(0);
  expect(ownerReadiness.body.cutoverReport.runbookCommands.length).toBeGreaterThan(0);
  expect(ownerReadiness.body.cutoverReport.runbookCommands[0]).toBe(
    "npm run verify:persistence:ops",
  );
  expect(ownerReadiness.body.cutoverReport.runbookCommands).toContain(
    "DATABASE_URL=postgresql://username:password@host:5432/lessonforge",
  );
  expect(ownerReadiness.body.cutoverReport.actionItems.length).toBeGreaterThan(0);
  expect(ownerReadiness.body.cutoverReport.actionItems[0].statusDescription).toMatch(
    /Already satisfied|Run this now|Waiting on an earlier prerequisite/,
  );

  await page.goto("/founder", { waitUntil: "domcontentloaded" });
  const founderBadge = page.getByTestId("header-persistence-badge");
  await expect(founderBadge).toBeVisible();
  await expect(founderBadge).toHaveText(/Cutover blocked|Ready to verify|Verification failed|Cutover verified/);
  const founderCutoverCard = page.getByTestId("founder-cutover-card");
  await expect(founderCutoverCard).toBeVisible();
  await expect(page.getByTestId("founder-cutover-headline")).toHaveText(
    /Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/,
  );
  await expect(page.getByTestId("founder-cutover-summary")).toContainText(
    /Database setup is still blocked|The database environment is ready|Strict Prisma seller-flow verification has passed|Strict Prisma verification still needs attention/,
  );
  await expect(page.getByTestId("founder-cutover-card-runtime")).toContainText(
    /Auto mode using demo JSON|Auto mode using Prisma|Prisma mode|Demo JSON mode/,
  );
  await expect(page.getByTestId("founder-cutover-card-runtime")).toContainText(
    /mode: auto|mode: prisma|mode: json/,
  );
  await expect(page.getByTestId("founder-cutover-card-runtime-note")).toContainText(
    /strict Prisma mode|demo JSON storage|demo-safe auto fallback|Prisma path through auto mode/,
  );
  await expect(page.getByTestId("founder-cutover-card-runbook")).toContainText(
    /Step 1|npm run verify:persistence:ops|DATABASE_URL=|LESSONFORGE_PERSISTENCE_MODE=prisma|npm run prisma:verify-seller-flow/,
  );
  await expect(page.getByTestId("founder-cutover-command")).toContainText(
    /DATABASE_URL=|npm run prisma:verify-seller-flow/,
  );
  const founderCopyButton = page.getByTestId("founder-cutover-card-copy-command");
  await expect(founderCopyButton).toBeVisible();
  await founderCopyButton.scrollIntoViewIfNeeded();
  await founderCopyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const founderCopyReportButton = page.getByTestId("founder-cutover-card-copy-report");
  await expect(founderCopyReportButton).toBeVisible();
  await founderCopyReportButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const founderRunbookCopyButton = page.getByTestId("founder-cutover-card-runbook-copy-1");
  await expect(founderRunbookCopyButton).toBeVisible();
  await founderRunbookCopyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByTestId("founder-cutover-card-details")).toContainText(
    /DATABASE_URL|Switch to strict Prisma mode|The database cannot be checked|The next live check is seller profile and product verification|Seller profile save and reload succeeded/,
  );
  await expect(page.getByTestId("founder-cutover-card-actions")).toContainText(
    /Real DATABASE_URL configured|Persistence mode switched to strict Prisma|Database connection reachable|Ready for seller-flow verification|Run seller-flow verification|done|next|blocked/,
  );
  await page.getByRole("link", { name: "Open admin dashboard" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/founder", { waitUntil: "domcontentloaded" });
  await page.locator("header").getByRole("link", { name: "How It Works" }).click();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await page.goto("/founder", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Review marketplace" }).click();
  await expect(page).toHaveURL(/\/marketplace$/);
  await page.goto("/founder", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Review seller dashboard" }).click();
  await expect(page).toHaveURL(/\/sell\/dashboard(?:\?.*)?$/);
  await page.goto("/founder", { waitUntil: "domcontentloaded" });
  const founderGuidedCutover = page.getByTestId("persistence-guided-cutover");
  await expect(founderGuidedCutover).toBeVisible();
  await expect(founderGuidedCutover).toContainText(/Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/);
  await expect(founderGuidedCutover).toContainText(
    /Required database or Prisma setup is still missing|The environment is ready, and the next live step is seller-flow verification|The first strict Prisma seller-flow verification completed successfully|Prisma was reachable, but the live verification still found a persistence-path problem/,
  );
  await expect(page.getByTestId("persistence-runbook")).toContainText(
    /Step 1|npm run verify:persistence:ops|DATABASE_URL=|LESSONFORGE_PERSISTENCE_MODE=prisma|npm run prisma:verify-seller-flow/,
  );
  await expect(page.getByTestId("persistence-runtime-note")).toContainText(
    /strict Prisma mode|demo JSON storage|demo-safe auto fallback|Prisma path through auto mode/,
  );
  await expect(page.getByTestId("persistence-guided-details")).toContainText(
    /DATABASE_URL|The database cannot be checked|The next live check is seller profile and product verification|Seller profile save and reload succeeded/,
  );
  await expect(page.getByTestId("persistence-guided-actions")).toContainText(
    /Real DATABASE_URL configured|Run seller-flow verification|Already satisfied|Run this now|Waiting on an earlier prerequisite/,
  );
  await expect(page.getByTestId("persistence-guided-command")).toContainText("DATABASE_URL=");

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const adminReadiness = await fetchPersistenceReadiness(page);
  expect(adminReadiness.ok).toBeTruthy();
  expect(adminReadiness.status).toBe(200);
  expect(adminReadiness.body.cutoverReport.stageHeadline).toMatch(
    /Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/,
  );
  expect(adminReadiness.body.cutoverReport.runbookCommands[0]).toBe(
    "npm run verify:persistence:ops",
  );
  const adminBadge = page.getByTestId("header-persistence-badge");
  await expect(adminBadge).toBeVisible();
  await expect(adminBadge).toHaveText(/Cutover blocked|Ready to verify|Verification failed|Cutover verified/);
  await adminBadge.click();
  await expect(page).toHaveURL(/\/founder$/);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const adminCutoverCard = page.getByTestId("admin-cutover-card");
  await expect(adminCutoverCard).toBeVisible();
  await expect(page.getByTestId("admin-cutover-headline")).toHaveText(
    /Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/,
  );
  await expect(page.getByTestId("admin-cutover-summary")).toContainText(
    /Database setup is still blocked|The database environment is ready|Strict Prisma seller-flow verification has passed|Strict Prisma verification still needs attention/,
  );
  await expect(page.getByTestId("admin-cutover-card-runtime")).toContainText(
    /Auto mode using demo JSON|Auto mode using Prisma|Prisma mode|Demo JSON mode/,
  );
  await expect(page.getByTestId("admin-cutover-card-runtime")).toContainText(
    /mode: auto|mode: prisma|mode: json/,
  );
  await expect(page.getByTestId("admin-cutover-card-runtime-note")).toContainText(
    /strict Prisma mode|demo JSON storage|demo-safe auto fallback|Prisma path through auto mode/,
  );
  await expect(page.getByTestId("admin-cutover-card-runbook")).toContainText(
    /Step 1|npm run verify:persistence:ops|DATABASE_URL=|LESSONFORGE_PERSISTENCE_MODE=prisma|npm run prisma:verify-seller-flow/,
  );
  await expect(page.getByTestId("admin-cutover-command")).toContainText(
    /DATABASE_URL=|npm run prisma:verify-seller-flow/,
  );
  const adminCopyButton = page.getByTestId("admin-cutover-card-copy-command");
  await expect(adminCopyButton).toBeVisible();
  await adminCopyButton.scrollIntoViewIfNeeded();
  await adminCopyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const adminCopyReportButton = page.getByTestId("admin-cutover-card-copy-report");
  await expect(adminCopyReportButton).toBeVisible();
  await adminCopyReportButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const adminRunbookCopyButton = page.getByTestId("admin-cutover-card-runbook-copy-1");
  await expect(adminRunbookCopyButton).toBeVisible();
  await adminRunbookCopyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByTestId("admin-cutover-card-details")).toContainText(
    /DATABASE_URL|Switch to strict Prisma mode|The database cannot be checked|The next live check is seller profile and product verification|Seller profile save and reload succeeded/,
  );
  await expect(page.getByTestId("admin-cutover-card-actions")).toContainText(
    /Real DATABASE_URL configured|Persistence mode switched to strict Prisma|Database connection reachable|Ready for seller-flow verification|Run seller-flow verification|done|next|blocked/,
  );
  await expect(page.getByText("Persistence status")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh status" })).toBeVisible();
  const copyReportButton = page.getByTestId("persistence-copy-report");
  await expect(copyReportButton).toBeVisible();
  await copyReportButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const copyJsonButton = page.getByTestId("persistence-copy-json");
  await expect(copyJsonButton).toBeVisible();
  await copyJsonButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await expect(page.getByText(/Loaded from server render|Auto-refreshed at|Manually refreshed at/)).toBeVisible();
  await expect(page.getByText(/Auto refresh 30s|Manual refresh/)).toBeVisible();
  const adminGuidedCutover = page.getByTestId("persistence-guided-cutover");
  await expect(adminGuidedCutover).toBeVisible();
  await expect(adminGuidedCutover).toContainText(/Blocked before live verification|Ready for live verification|Live verification passed|Live verification needs attention/);
  await expect(adminGuidedCutover).toContainText(
    /Required database or Prisma setup is still missing|The environment is ready, and the next live step is seller-flow verification|The first strict Prisma seller-flow verification completed successfully|Prisma was reachable, but the live verification still found a persistence-path problem/,
  );
  await expect(page.getByTestId("persistence-runbook")).toContainText(
    /Step 1|npm run verify:persistence:ops|DATABASE_URL=|LESSONFORGE_PERSISTENCE_MODE=prisma|npm run prisma:verify-seller-flow/,
  );
  await expect(page.getByTestId("persistence-runtime-note")).toContainText(
    /strict Prisma mode|demo JSON storage|demo-safe auto fallback|Prisma path through auto mode/,
  );
  await expect(page.getByTestId("persistence-guided-details")).toContainText(
    /DATABASE_URL|The database cannot be checked|The next live check is seller profile and product verification|Seller profile save and reload succeeded/,
  );
  await expect(page.getByTestId("persistence-guided-actions")).toContainText(
    /Real DATABASE_URL configured|Run seller-flow verification|Already satisfied|Run this now|Waiting on an earlier prerequisite/,
  );
  await expect(page.getByTestId("persistence-guided-command")).toContainText("DATABASE_URL=");

  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(
    page.getByText(/Cutover blocked|Ready to verify|Verification failed|Cutover verified/),
  ).toBeVisible();

  const persistenceSection = page.getByTestId("persistence-status-card");
  const copyButton = persistenceSection.getByTestId("persistence-copy-command").first();
  await expect(copyButton).toBeVisible();
  await copyButton.scrollIntoViewIfNeeded();
  await copyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  const runbookCopyButton = page.getByTestId("persistence-runbook-copy-1");
  await expect(runbookCopyButton).toBeVisible();
  await runbookCopyButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await switchViewerRole(page, "buyer");
  const buyerReadiness = await fetchPersistenceReadiness(page);
  expect(buyerReadiness.ok).toBeFalsy();
  expect(buyerReadiness.status).toBe(403);
  expect(buyerReadiness.body).toEqual({
    error: "Admin access required.",
  });
});

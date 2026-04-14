export type ApiMethod = "GET" | "POST" | "PATCH";

export type ApiReferenceItem = {
  auth: string;
  body?: string;
  description: string;
  method: ApiMethod;
  path: string;
  query?: string;
};

export type ApiReferenceSection = {
  description: string;
  items: ApiReferenceItem[];
  title: string;
};

export const apiReferenceSections: ApiReferenceSection[] = [
  {
    title: "Session and Roles",
    description: "Use these endpoints to inspect or switch the current viewer role.",
    items: [
      {
        method: "GET",
        path: "/api/session/viewer",
        description: "Returns the current viewer object.",
        auth: "Public session",
      },
      {
        method: "POST",
        path: "/api/session/viewer",
        description: "Switches the current viewer role.",
        auth: "Public session",
        body: '{ "role": "buyer" | "seller" | "admin" | "owner" }',
      },
    ],
  },
  {
    title: "Checkout and Orders",
    description: "These routes power checkout, purchase completion, and protected library delivery.",
    items: [
      {
        method: "POST",
        path: "/api/checkout",
        description: "Creates a real Stripe Checkout session when possible, otherwise falls back to checkout preview.",
        auth: "Buyer flow",
        body: '{ "resourceId": "..." } or { "resource": { ... } }',
      },
      {
        method: "POST",
        path: "/api/lessonforge/purchase",
        description: "Creates a purchase order from JSON for the current buyer flow.",
        auth: "Buyer flow",
        body: '{ "productId": "...", "buyerEmail": "...", "amountCents": 1200, ... }',
      },
      {
        method: "POST",
        path: "/api/lessonforge/purchase-complete",
        description: "Completes the checkout preview purchase form and redirects into the library.",
        auth: "Buyer flow",
        body: "FormData from checkout preview",
      },
      {
        method: "GET",
        path: "/api/lessonforge/library-delivery",
        description: "Redirects the buyer into a protected download flow for an order.",
        auth: "Buyer only",
        query: "orderId=...",
      },
      {
        method: "POST",
        path: "/api/lessonforge/library-delivery",
        description: "Returns a protected delivery URL and expiration for an order.",
        auth: "Buyer only",
        body: '{ "orderId": "..." }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/protected-download",
        description: "Validates a protected delivery token and streams the purchased file placeholder.",
        auth: "Buyer only",
        query: "token=...",
      },
    ],
  },
  {
    title: "Products and Catalog",
    description: "These routes create products, list persisted products, and support moderation changes.",
    items: [
      {
        method: "GET",
        path: "/api/lessonforge/products",
        description: "Lists persisted products.",
        auth: "Public access",
      },
      {
        method: "POST",
        path: "/api/lessonforge/products",
        description: "Creates or saves a product after validation.",
        auth: "Seller flow",
        body: '{ "product": { ...ProductRecord } }',
      },
      {
        method: "PATCH",
        path: "/api/lessonforge/products",
        description: "Updates product moderation state and seller-facing moderation feedback.",
        auth: "Admin or owner only",
        body: '{ "productId": "...", "productStatus": "Flagged", "moderationFeedback": "..." }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/ranking-insights",
        description: "Returns seller-specific ranking and marketplace performance insights.",
        auth: "Seller flow",
        query: "sellerId=...",
      },
    ],
  },
  {
    title: "Seller Setup and AI",
    description: "These endpoints handle seller profile setup, Stripe onboarding, payout status, and seller AI usage.",
    items: [
      {
        method: "GET",
        path: "/api/lessonforge/seller-profile",
        description: "Lists seller profiles.",
        auth: "Public access",
      },
      {
        method: "POST",
        path: "/api/lessonforge/seller-profile",
        description: "Saves a seller profile draft.",
        auth: "Seller flow",
        body: '{ "profile": { ...SellerProfileDraft } }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/seller-ai",
        description: "Returns seller AI subscription, ledger, and admin setting overview.",
        auth: "Seller flow",
        query: "sellerId=...&sellerEmail=...&sellerPlanKey=starter",
      },
      {
        method: "POST",
        path: "/api/sellers/onboard",
        description: "Creates or reopens Stripe Connect onboarding and returns the onboarding URL.",
        auth: "Seller flow",
        body: '{ "email": "...", "displayName": "..." } or { "accountId": "..." }',
      },
      {
        method: "POST",
        path: "/api/sellers/status",
        description: "Returns payout status details for one or more seller accounts.",
        auth: "Seller or admin tooling",
        body: '{ "accounts": [{ "accountId": "...", "key": "seller-a" }] }',
      },
      {
        method: "POST",
        path: "/api/lessonforge/ai/standards-scan",
        description: "Runs the seller standards scan and consumes seller AI credits.",
        auth: "Seller flow",
        body: '{ "sellerId": "...", "sellerEmail": "...", "title": "...", "excerpt": "...", "provider": "openai" }',
      },
    ],
  },
  {
    title: "Buyer Saved, Reviews, and Support",
    description: "These endpoints power favorites, reviews, refund requests, and issue reports.",
    items: [
      {
        method: "GET",
        path: "/api/lessonforge/favorites",
        description: "Returns the current buyer’s saved products.",
        auth: "Buyer only",
      },
      {
        method: "POST",
        path: "/api/lessonforge/favorites",
        description: "Toggles a product in or out of the buyer shortlist.",
        auth: "Buyer only",
        body: '{ "productId": "..." }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/reviews",
        description: "Lists reviews.",
        auth: "Public access",
      },
      {
        method: "POST",
        path: "/api/lessonforge/reviews",
        description: "Creates a new product review.",
        auth: "Buyer flow",
        body: '{ "productId": "...", "rating": 5, "title": "...", "body": "...", ... }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/refund-requests",
        description: "Lists refund requests.",
        auth: "Admin, owner, or review flow",
      },
      {
        method: "POST",
        path: "/api/lessonforge/refund-requests",
        description: "Creates a refund request for a purchased order.",
        auth: "Buyer flow",
        body: '{ "orderId": "...", "reason": "...", ... }',
      },
      {
        method: "PATCH",
        path: "/api/lessonforge/refund-requests",
        description: "Approves or denies a refund request with an admin note.",
        auth: "Admin or owner only",
        body: '{ "refundRequestId": "...", "status": "Approved", "adminResolutionNote": "..." }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/reports",
        description: "Lists buyer reports.",
        auth: "Admin, owner, or review flow",
      },
      {
        method: "POST",
        path: "/api/lessonforge/reports",
        description: "Creates a new report.",
        auth: "Buyer flow",
        body: '{ "report": { ...ReportPayload } }',
      },
      {
        method: "PATCH",
        path: "/api/lessonforge/reports",
        description: "Updates report triage status and admin resolution note.",
        auth: "Admin or owner only",
        body: '{ "reportId": "...", "status": "Resolved", "adminResolutionNote": "..." }',
      },
    ],
  },
  {
    title: "Admin and Owner Controls",
    description: "These routes expose AI settings, system settings, and persistence readiness reporting.",
    items: [
      {
        method: "GET",
        path: "/api/lessonforge/admin-ai-settings",
        description: "Returns current AI control settings.",
        auth: "Admin or owner only",
      },
      {
        method: "PATCH",
        path: "/api/lessonforge/admin-ai-settings",
        description: "Updates AI kill switch and warning thresholds.",
        auth: "Owner only",
        body: '{ "aiKillSwitchEnabled": true, "warningThresholds": { ... } }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/system-settings",
        description: "Returns maintenance-mode and other system settings.",
        auth: "Admin or owner only",
      },
      {
        method: "PATCH",
        path: "/api/lessonforge/system-settings",
        description: "Updates maintenance-mode settings.",
        auth: "Owner only",
        body: '{ "maintenanceModeEnabled": true, "maintenanceMessage": "..." }',
      },
      {
        method: "GET",
        path: "/api/lessonforge/persistence-readiness",
        description: "Returns cutover and persistence readiness information based on viewer role.",
        auth: "Role-aware",
      },
    ],
  },
  {
    title: "Generated Asset Endpoints",
    description: "These endpoints generate managed preview and thumbnail SVG assets for marketplace listings.",
    items: [
      {
        method: "GET",
        path: "/api/lessonforge/preview-assets/[slug]",
        description: "Returns a generated preview SVG for a listing page.",
        auth: "Public access",
        query: "page=1",
      },
      {
        method: "GET",
        path: "/api/lessonforge/thumbnail-assets/[slug]",
        description: "Returns a generated thumbnail SVG for a listing.",
        auth: "Public access",
      },
    ],
  },
];

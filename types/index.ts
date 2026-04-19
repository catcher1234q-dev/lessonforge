export type SubjectHub = {
  name: string;
  description: string;
  resourceCount: string;
  spotlight: string;
  gradeBand: string;
  colorClass: string;
};

export type ProductRecord = {
  id: string;
  title: string;
  subject: string;
  gradeBand: string;
  standardsTag: string;
  updatedAt: string;
  format: string;
  summary: string;
  demoOnly: boolean;
  resourceType?: string;
  shortDescription?: string;
  fullDescription?: string;
  licenseType?: string;
  fileTypes?: string[];
  includedItems?: string[];
  thumbnailUrl?: string;
  previewAssetUrls?: string[];
  originalAssetUrl?: string;
  assetVersionNumber?: number;
  previewIncluded?: boolean;
  thumbnailIncluded?: boolean;
  rightsConfirmed?: boolean;
  freshnessScore?: number;
  sellerName?: string;
  sellerHandle?: string;
  sellerId?: string;
  sellerStripeAccountEnvKey?: string;
  sellerStripeAccountId?: string;
  priceCents?: number;
  isPurchasable?: boolean;
  productStatus?:
    | "Draft"
    | "Pending review"
    | "Published"
    | "Flagged"
    | "Rejected"
    | "Removed";
  moderationFeedback?: string;
  createdPath?: "Manual upload" | "Manual from scratch" | "AI assisted";
  imageGallery?: ProductGalleryImage[];
};

export type ProductGalleryImage = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  role: "cover" | "preview";
  position: number;
  coverUrl: string;
  previewUrl: string;
};

export type ConnectedSeller = {
  accountId: string;
  displayName: string;
  email: string;
  status?: "connected" | "setup_incomplete";
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
};

export type ViewerRole = "buyer" | "seller" | "admin" | "owner";

export type Viewer = {
  role: ViewerRole;
  name: string;
  email: string;
  sellerDisplayName?: string;
};

export type SellerProfileDraft = {
  displayName: string;
  email: string;
  storeName: string;
  storeHandle: string;
  primarySubject: string;
  tagline: string;
  sellerPlanKey: "starter" | "basic" | "pro";
  onboardingCompleted: boolean;
  stripeAccountId?: string;
  stripeOnboardingStatus?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
};

export type OrderRecord = {
  id: string;
  productId: string;
  productTitle: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerName: string;
  sellerId: string;
  amountCents: number;
  sellerShareCents: number;
  platformShareCents: number;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  versionLabel: string;
  accessType: string;
  updatedLabel: string;
  instructions: string;
  purchasedAt: string;
};

export type LibraryAccessRecord = {
  userId: string;
  productId: string;
  grantedAt: string;
};

export type StripeWebhookEventRecord = {
  eventId: string;
  eventType: string;
  status: "received" | "processed" | "ignored" | "failed";
  userId?: string;
  productId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  processedAt?: string;
};

export type ReviewRecord = {
  id: string;
  productId: string;
  productTitle: string;
  rating: number;
  title: string;
  body: string;
  buyerName: string;
  buyerEmail?: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type RefundRequestRecord = {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerName: string;
  reason: string;
  status: "Submitted" | "Approved" | "Denied";
  adminResolutionNote?: string;
  requestedAt: string;
};

export type ReportRecord = {
  id: string;
  productId: string;
  productTitle: string;
  reporterName?: string;
  reporterEmail?: string;
  category:
    | "Broken file"
    | "Copyright"
    | "Misleading listing"
    | "Low quality"
    | "Spam"
    | "Access issue";
  status: "Open" | "Under review" | "Resolved" | "Dismissed";
  details: string;
  adminResolutionNote?: string;
  createdAt: string;
};

export type FavoriteRecord = {
  id: string;
  userEmail: string;
  productId: string;
  createdAt: string;
};

export type SubscriptionRecord = {
  sellerId: string;
  sellerEmail: string;
  planKey: "starter" | "basic" | "pro";
  monthlyCredits: number;
  availableCredits: number;
  cycleLabel: string;
  rolloverPolicy: "none";
};

export type UsageLedgerEntry = {
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
  status: "applied" | "refunded";
  provider: "openai" | "gemini";
  idempotencyKey: string;
  createdAt: string;
};

export type AiActionCacheRecord = {
  id: string;
  sellerId: string;
  action: UsageLedgerEntry["action"];
  provider: UsageLedgerEntry["provider"];
  cacheKey: string;
  result: AIProviderResult;
  createdAt: string;
};

export type MonetizationEventRecord = {
  id: string;
  sellerId: string;
  sellerEmail: string;
  planKey: SubscriptionRecord["planKey"];
  eventType:
    | "listing_created"
    | "listing_limit_hit"
    | "ai_credit_used"
    | "ai_credit_limit_hit"
    | "locked_feature_clicked"
    | "upgrade_click";
  source:
    | "seller_creator"
    | "seller_dashboard"
    | "seller_editor"
    | "pricing"
    | "unknown";
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AdminAiSettings = {
  aiKillSwitchEnabled: boolean;
  warningThresholds: {
    starter: number;
    basic: number;
    pro: number;
  };
  updatedAt: string;
};

export type SystemSettings = {
  maintenanceModeEnabled: boolean;
  maintenanceMessage: string;
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorEmail?: string;
  actorRole?: ViewerRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type FeedbackRating = "Easy" | "Okay" | "Confusing";

export type PrivateFeedbackRecord = {
  id: string;
  createdAt: string;
  rating?: FeedbackRating;
  confusingText?: string;
  improvementText?: string;
  contact?: string;
  pageContext?: string;
  source?: string;
  signedIn: boolean;
  userEmail?: string;
  userRole?: ViewerRole;
};

export type AIProviderResult = {
  provider: "gemini" | "openai";
  status: "idle" | "placeholder" | "success";
  message: string;
  subject: string;
  suggestedStandard: string;
  rationale: string;
  confidence: string;
};

export type StandardsMappingExample = {
  id: string;
  title: string;
  subject: string;
  gradeBand: string;
  excerpt: string;
  suggestedStandard: string;
  rationale: string;
};

export type MarketplacePhase = {
  title: string;
  status: "In progress" | "Next" | "Upcoming" | "Completed";
  summary: string;
};

export type DemoResource = ProductRecord;
export type DemoViewerRole = ViewerRole;
export type DemoViewer = Viewer;
export type DemoOrder = OrderRecord;
export type DemoReview = ReviewRecord;
export type DemoRefundRequest = RefundRequestRecord;
export type DemoReport = ReportRecord;
export type DemoFavorite = FavoriteRecord;
export type DemoSubscription = SubscriptionRecord;
export type DemoUsageLedgerEntry = UsageLedgerEntry;
export type DemoAiActionCacheRecord = AiActionCacheRecord;
export type DemoMonetizationEventRecord = MonetizationEventRecord;
export type DemoAdminAiSettings = AdminAiSettings;
export type DemoSystemSettings = SystemSettings;
export type DemoAdminAuditLog = AdminAuditLog;

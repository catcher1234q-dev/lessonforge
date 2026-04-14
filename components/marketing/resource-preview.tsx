"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  CreditCard,
  Link as LinkIcon,
  Search,
  UploadCloud,
  WandSparkles,
} from "lucide-react";

import { mapStandardsWithGemini, mapStandardsWithOpenAI } from "@/lib/ai/providers";
import { WatermarkedPreviewStack } from "@/components/marketplace/watermarked-preview-stack";
import {
  calculatePlatformFee,
  calculateSellerPayout,
  formatCurrency,
  getTeacherPayoutShareLabel,
  PAYMENT_METHOD_GROUPS,
} from "@/lib/marketplace/config";
import {
  CONNECTED_SELLER_STORAGE_KEY,
  UPLOADED_RESOURCES_STORAGE_KEY,
} from "@/lib/local/storage";
import type { ConnectedSeller, ProductRecord } from "@/types";

const subjectOptions = ["Math", "ELA", "Science", "Social Studies"] as const;
const gradeOptions = [
  "K-12",
  "K-5",
  "6-8",
  "9-12",
] as const;

function getFormatFromFiles(files: File[]) {
  if (!files.length) {
    return "Uploaded Resource";
  }

  const extension = files[0]?.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "Uploaded PDF";
    case "ppt":
    case "pptx":
      return "Slide Deck";
    case "doc":
    case "docx":
      return "Lesson Document";
    case "png":
    case "jpg":
    case "jpeg":
      return "Image Resource";
    default:
      return "Uploaded Resource";
  }
}

function sortResources(resources: ProductRecord[], sortBy: string) {
  const copy = [...resources];

  if (sortBy === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortBy === "subject") {
    return copy.sort((a, b) => a.subject.localeCompare(b.subject));
  }

  return copy;
}

type CheckoutStatus = "live" | "onboarding_required" | "connect_required";
type SellerStatusResponse = {
  accountId: string | null;
  status: CheckoutStatus;
  transferStatus: string | null;
  payoutStatus: string | null;
  requirements: string[];
};

function getSellerStatusKey(resource: ProductRecord) {
  return resource.sellerStripeAccountId ?? resource.sellerStripeAccountEnvKey ?? null;
}

function getCheckoutStatus(
  resource: ProductRecord,
  sellerStatuses: Record<string, SellerStatusResponse>,
): CheckoutStatus {
  const sellerStatusKey = getSellerStatusKey(resource);

  if (sellerStatusKey && sellerStatuses[sellerStatusKey]) {
    return sellerStatuses[sellerStatusKey].status;
  }

  if (!resource.priceCents || !resource.isPurchasable) {
    return "connect_required";
  }

  if (resource.sellerStripeAccountId) {
    return "live";
  }

  if (resource.sellerStripeAccountEnvKey) {
    return "onboarding_required";
  }

  return "connect_required";
}

export function ResourcePreview() {
  const [uploadedResources, setUploadedResources] = useState<ProductRecord[]>([]);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedResourceId, setSelectedResourceId] = useState("");

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState<(typeof subjectOptions)[number]>("Math");
  const [uploadGradeBand, setUploadGradeBand] = useState<(typeof gradeOptions)[number]>("K-12");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadProvider, setUploadProvider] = useState<"openai" | "gemini">("openai");
  const [uploadPrice, setUploadPrice] = useState("12");
  const [sellerDisplayName, setSellerDisplayName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnectingSeller, setIsConnectingSeller] = useState(false);
  const [isOpeningResourceOnboarding, setIsOpeningResourceOnboarding] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [connectedSeller, setConnectedSeller] = useState<ConnectedSeller | null>(null);
  const [sellerStatuses, setSellerStatuses] = useState<
    Record<string, SellerStatusResponse>
  >({});

  useEffect(() => {
    const saved = window.localStorage.getItem(UPLOADED_RESOURCES_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as ProductRecord[];
      setUploadedResources(parsed);
      if (parsed[0]) {
        setSelectedResourceId(parsed[0].id);
      }
    } catch {
      window.localStorage.removeItem(UPLOADED_RESOURCES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const savedSeller = window.localStorage.getItem(CONNECTED_SELLER_STORAGE_KEY);
    if (savedSeller) {
      try {
        const parsed = JSON.parse(savedSeller) as ConnectedSeller;
        setConnectedSeller(parsed);
        setSellerDisplayName(parsed.displayName);
        setSellerEmail(parsed.email);
      } catch {
        window.localStorage.removeItem(CONNECTED_SELLER_STORAGE_KEY);
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("seller_connected") === "1") {
      const accountId = params.get("account_id");
      const email = params.get("seller_email");
      const displayName = params.get("seller_name");

      if (accountId && email && displayName) {
        const seller = { accountId, email, displayName };
        setConnectedSeller(seller);
        setSellerDisplayName(displayName);
        setSellerEmail(email);
        setSellerMessage(
          `${displayName} is connected to Stripe. If Stripe still needs details, finish onboarding to enable live payouts.`,
        );
        window.localStorage.setItem(
          CONNECTED_SELLER_STORAGE_KEY,
          JSON.stringify(seller),
        );
      }

      params.delete("seller_connected");
      params.delete("account_id");
      params.delete("seller_email");
      params.delete("seller_name");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      UPLOADED_RESOURCES_STORAGE_KEY,
      JSON.stringify(uploadedResources),
    );
  }, [uploadedResources]);

  useEffect(() => {
    if (!connectedSeller?.accountId) {
      return;
    }

    setUploadedResources((current) =>
      current.map((resource) =>
        resource.sellerStripeAccountId
          ? resource
          : {
              ...resource,
              sellerName: resource.sellerName || connectedSeller.displayName,
              sellerHandle: resource.sellerHandle || `(${connectedSeller.email})`,
              sellerId: resource.sellerId || connectedSeller.email,
              sellerStripeAccountId: connectedSeller.accountId,
              isPurchasable: true,
            },
      ),
    );
  }, [connectedSeller]);

  const allResources = useMemo(() => uploadedResources, [uploadedResources]);

  useEffect(() => {
    const sellerAccountMap = new Map<
      string,
      {
        key: string;
        accountId?: string;
        sellerAccountEnvKey?: string;
      }
    >();

    for (const resource of allResources) {
      const key = getSellerStatusKey(resource);

      if (!key) {
        continue;
      }

      sellerAccountMap.set(key, {
        key,
        accountId: resource.sellerStripeAccountId,
        sellerAccountEnvKey: resource.sellerStripeAccountEnvKey,
      });
    }

    const sellerAccounts = Array.from(sellerAccountMap.values());

    if (!sellerAccounts.length) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/sellers/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accounts: sellerAccounts,
          }),
        });

        const payload = (await response.json()) as {
          statuses?: Record<string, SellerStatusResponse>;
        };

        if (!response.ok || !payload.statuses || isCancelled) {
          return;
        }

        setSellerStatuses(payload.statuses);
      } catch {
        if (!isCancelled) {
          setSellerStatuses({});
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [allResources]);

  const visibleResources = useMemo(() => {
    const filtered = allResources.filter((resource) => {
      const matchesSubject =
        subjectFilter === "All" ? true : resource.subject === subjectFilter;
      const haystack =
        `${resource.title} ${resource.subject} ${resource.gradeBand} ${resource.summary} ${resource.format}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());

      return matchesSubject && matchesQuery;
    });

    return sortResources(filtered, sortBy);
  }, [allResources, query, sortBy, subjectFilter]);

  const selectedResource =
    visibleResources.find((resource) => resource.id === selectedResourceId) ??
    visibleResources[0] ??
    null;
  const selectedResourceCheckoutStatus = selectedResource
    ? getCheckoutStatus(selectedResource, sellerStatuses)
    : "connect_required";
  const selectedSellerStatus = selectedResource
    ? sellerStatuses[getSellerStatusKey(selectedResource) ?? ""]
    : undefined;

  const subjects = ["All", ...new Set(allResources.map((resource) => resource.subject))];

  useEffect(() => {
    if (selectedResource?.id) {
      setSelectedResourceId(selectedResource.id);
    }
  }, [selectedResource?.id]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setUploadMessage(null);

    if (!uploadTitle && files[0]) {
      const normalized = files[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setUploadTitle(
        normalized.replace(/\b\w/g, (character) => character.toUpperCase()),
      );
    }
  }

  async function handleUpload() {
    if (!selectedFiles.length) {
      setUploadMessage("Choose at least one file to create a LessonForge resource.");
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadMessage("Add a title so the uploaded resource can appear in browse.");
      return;
    }

    const parsedPrice = Math.round(Number(uploadPrice) * 100);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 100) {
      setUploadMessage("Set a valid resource price of at least $1.00.");
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    const excerpt = `${uploadNotes} ${selectedFiles.map((file) => file.name).join(" ")}`.trim();
    const mapping =
      uploadProvider === "openai"
        ? await mapStandardsWithOpenAI({
            title: uploadTitle,
            excerpt,
          })
        : await mapStandardsWithGemini({
            title: uploadTitle,
            excerpt,
          });

    const nextResource: ProductRecord = {
      id: `upload-${Date.now()}`,
      title: uploadTitle.trim(),
      subject: uploadSubject,
      gradeBand: uploadGradeBand,
      standardsTag: mapping.suggestedStandard,
      updatedAt: "Uploaded just now",
      format: getFormatFromFiles(selectedFiles),
      summary:
        uploadNotes.trim() ||
        `Uploaded from ${selectedFiles.map((file) => file.name).join(", ")}.`,
      demoOnly: false,
      sellerName: connectedSeller?.displayName || sellerDisplayName || undefined,
      sellerHandle: sellerEmail ? `(${sellerEmail})` : undefined,
      sellerId: sellerEmail || `seller-${Date.now()}`,
      sellerStripeAccountId: connectedSeller?.accountId,
      priceCents: parsedPrice,
      isPurchasable: Boolean(connectedSeller?.accountId),
    };

    setUploadedResources((current) => [nextResource, ...current]);
    setSelectedResourceId(nextResource.id);
    setSubjectFilter("All");
    setQuery("");
    setUploadTitle("");
    setUploadNotes("");
    setUploadPrice("12");
    setSelectedFiles([]);
    setUploadMessage(
      `${nextResource.title} is now live in Browse with ${mapping.suggestedStandard}${connectedSeller?.accountId ? " and is ready to sell." : ", but payouts still need to be connected to sell it."}`,
    );
    setIsUploading(false);
  }

  async function handleSellerOnboarding() {
    if (!sellerDisplayName.trim() || !sellerEmail.trim()) {
      setSellerMessage("Add a seller name and email to connect payouts.");
      return;
    }

    try {
      setIsConnectingSeller(true);
      setSellerMessage(null);

      const response = await fetch("/api/sellers/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: sellerDisplayName.trim(),
          email: sellerEmail.trim(),
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start seller onboarding.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setSellerMessage(
        error instanceof Error ? error.message : "Unable to start seller onboarding.",
      );
      setIsConnectingSeller(false);
    }
  }

  async function handleCheckout(resource: ProductRecord) {
    setCheckoutMessage(null);

    if (!resource.isPurchasable) {
      setCheckoutMessage(
        "Uploaded resources need seller payout onboarding before they can be sold.",
      );
      return;
    }

    try {
      setIsCheckingOut(true);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: resource.id,
          resource,
          returnTo: `${window.location.pathname}${window.location.search}`,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start checkout.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setCheckoutMessage(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
      setIsCheckingOut(false);
    }
  }

  async function handleExistingSellerOnboarding(resource: ProductRecord) {
    if (!resource.sellerStripeAccountEnvKey && !resource.sellerStripeAccountId) {
      setCheckoutMessage(
        "This listing does not have a seller payout account to reconnect yet.",
      );
      return;
    }

    try {
      setIsOpeningResourceOnboarding(true);
      setCheckoutMessage(null);

      const response = await fetch("/api/sellers/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: resource.sellerStripeAccountId,
          sellerAccountEnvKey: resource.sellerStripeAccountEnvKey,
          displayName: resource.sellerName,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to reopen seller onboarding.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setCheckoutMessage(
        error instanceof Error
          ? error.message
          : "Unable to reopen seller onboarding.",
      );
      setIsOpeningResourceOnboarding(false);
    }
  }

  return (
    <section
      className="px-5 py-12 sm:px-6 lg:px-8 lg:py-16"
      id="resource-marketplace"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Upload Flow
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-ink sm:text-5xl">
            Create the first real listing and watch it move through the site.
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            Start with your own upload, watch it appear in browse, then open the buyer
            view to preview and purchase it.
          </p>
        </div>
        <div className="rounded-[2rem] border border-ink/5 bg-white p-6 shadow-soft-xl sm:p-8">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              "1. Create a listing",
              "2. See it appear in browse",
              "3. Open the buyer preview and checkout",
            ].map((step) => (
              <div
                key={step}
                className="rounded-[1.35rem] bg-surface-subtle px-4 py-3 text-sm font-semibold text-ink"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-[1.75rem] border border-ink/5 bg-surface-subtle/60 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
                    Step 1
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">
                    Create the first seller listing
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">
                    Keep this simple. Add a file, a title, the subject, grade, and price.
                    Payout setup and notes are here if you want to see the fuller seller flow.
                  </p>
                </div>
                <div className="rounded-full bg-brand-soft p-3 text-brand">
                  <UploadCloud className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-dashed border-brand/20 bg-brand-soft/50 p-4">
                    <label className="block text-sm font-semibold text-ink">
                      Resource files
                    </label>
                    <input
                      className="mt-3 block w-full text-sm text-ink-soft"
                      multiple
                      onChange={handleFileChange}
                      type="file"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedFiles.length ? (
                        selectedFiles.map((file) => (
                          <span
                            key={file.name}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-soft"
                          >
                            {file.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-ink-muted">
                          PDF, slides, docs, and images all work here.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-ink">Title</label>
                      <input
                        className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                        onChange={(event) => setUploadTitle(event.target.value)}
                        placeholder="5th Grade Fraction Exit Ticket Pack"
                        value={uploadTitle}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink">Subject</label>
                      <select
                        className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                        onChange={(event) =>
                          setUploadSubject(event.target.value as (typeof subjectOptions)[number])
                        }
                        value={uploadSubject}
                      >
                        {subjectOptions.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink">Grade band</label>
                      <select
                        className="mt-2 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                        onChange={(event) =>
                          setUploadGradeBand(event.target.value as (typeof gradeOptions)[number])
                        }
                        value={uploadGradeBand}
                      >
                        {gradeOptions.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-ink">Price</label>
                      <div className="mt-2 flex items-center rounded-[1.25rem] border border-ink/10 bg-white px-4">
                        <span className="text-sm text-ink-soft">$</span>
                        <input
                          className="w-full bg-transparent px-2 py-3 text-sm text-ink outline-none"
                          inputMode="decimal"
                          onChange={(event) => setUploadPrice(event.target.value)}
                          placeholder="12"
                          value={uploadPrice}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <details className="rounded-[1.5rem] border border-ink/5 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Open optional seller setup and notes
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[1.25rem] border border-ink/5 bg-surface-subtle p-4">
                      <label className="text-sm font-semibold text-ink">Seller payout setup</label>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        Connect payouts if you want this listing to be ready for real checkout.
                      </p>
                      <div className="mt-4 space-y-3">
                        <input
                          className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                          onChange={(event) => setSellerDisplayName(event.target.value)}
                          placeholder="Seller display name"
                          value={sellerDisplayName}
                        />
                        <input
                          className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                          onChange={(event) => setSellerEmail(event.target.value)}
                          placeholder="seller@school.org"
                          type="email"
                          value={sellerEmail}
                        />
                        <button
                          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
                          disabled={isConnectingSeller}
                          onClick={() => void handleSellerOnboarding()}
                          type="button"
                        >
                          <LinkIcon className="h-4 w-4" />
                          {connectedSeller?.accountId
                            ? "Reconnect Stripe payouts"
                            : isConnectingSeller
                              ? "Opening Stripe onboarding"
                              : "Connect Stripe payouts"}
                        </button>
                        <p className="text-sm leading-6 text-ink-soft">
                          {connectedSeller?.accountId
                            ? `Connected seller account: ${connectedSeller.displayName}`
                            : `Sellers keep ${getTeacherPayoutShareLabel()} of each sale before Stripe fees.`}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-ink/5 bg-surface-subtle p-4">
                      <label className="text-sm font-semibold text-ink">Optional teacher note</label>
                      <textarea
                        className="mt-3 min-h-24 w-full rounded-[1.25rem] border border-ink/10 bg-white px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-brand"
                        onChange={(event) => setUploadNotes(event.target.value)}
                        placeholder="Small-group practice for equivalent fractions with visual models and quick checks."
                        value={uploadNotes}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["openai", "gemini"] as const).map((provider) => (
                          <button
                            key={provider}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              uploadProvider === provider
                                ? "bg-brand text-white"
                                : "bg-white text-ink-soft hover:bg-brand-soft hover:text-brand"
                            }`}
                            onClick={() => setUploadProvider(provider)}
                            type="button"
                          >
                            {provider === "openai" ? "OpenAI" : "Gemini"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
                  disabled={isUploading}
                  onClick={() => void handleUpload()}
                  type="button"
                >
                  {isUploading ? (
                    <>
                      <WandSparkles className="h-4 w-4 animate-pulse" />
                      Uploading and tagging
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Create listing
                    </>
                  )}
                </button>
                <p className="text-sm text-ink-soft">
                  Once you upload, the listing appears in the browse step below.
                </p>
              </div>

              {uploadMessage ? (
                <div className="mt-4 flex items-start gap-3 rounded-[1.5rem] bg-white p-4 text-sm text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                  <span>{uploadMessage}</span>
                </div>
              ) : null}

              {sellerMessage ? (
                <div className="mt-4 flex items-start gap-3 rounded-[1.5rem] bg-white p-4 text-sm text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                  <span>{sellerMessage}</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-300">
                    Step 2
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">
                    Browse and pick the listing you want to inspect
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/70">
                    Search and filter the catalog, then choose one card below. Uploaded
                    items appear here as soon as they are created.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                    <input
                      className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-brand"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search uploaded resources"
                      value={query}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <button
                        key={subject}
                        className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                          subjectFilter === subject
                            ? "bg-white text-slate-950"
                            : "bg-white/10 text-white/75 hover:bg-white/20"
                        }`}
                        onClick={() => setSubjectFilter(subject)}
                        type="button"
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <select
                      className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-brand"
                      onChange={(event) => setSortBy(event.target.value)}
                      value={sortBy}
                    >
                      <option value="recent">Most recent</option>
                      <option value="title">Title</option>
                      <option value="subject">Subject</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-3">
                    {visibleResources.length ? (
                      visibleResources.map((resource) => {
                        const checkoutStatus = getCheckoutStatus(resource, sellerStatuses);

                        return (
                          <button
                            key={resource.id}
                            className={`min-w-[240px] rounded-[1.5rem] border p-4 text-left transition ${
                              selectedResource?.id === resource.id
                                ? "border-brand bg-brand/15"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                            onClick={() => setSelectedResourceId(resource.id)}
                            type="button"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold">{resource.title}</h3>
                              {resource.id.startsWith("upload-") ? (
                                <span className="rounded-full bg-brand/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-200">
                                  Upload
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-white/65">
                              {resource.subject} · {resource.gradeBand}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {resource.priceCents ? (
                                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                                  {formatCurrency(resource.priceCents)}
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                  checkoutStatus === "live"
                                    ? "bg-emerald-400/15 text-emerald-200"
                                    : checkoutStatus === "onboarding_required"
                                      ? "bg-amber-400/15 text-amber-200"
                                      : "bg-white/10 text-white/75"
                                }`}
                              >
                                {checkoutStatus === "live"
                                  ? "Live checkout"
                                  : checkoutStatus === "onboarding_required"
                                    ? "Onboarding required"
                                    : "Connect payouts"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                        No uploaded resources match this search yet. Upload the first file above to start the catalog.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedResource ? (
              <article className="rounded-[1.75rem] bg-slate-950 p-5 text-white sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-300">
                      Step 3
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-semibold">{selectedResource.title}</h3>
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        {selectedResource.standardsTag}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/70">
                      Open the buyer view, inspect the protected preview pages, and then
                      decide if the listing is ready for checkout.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/5 px-4 py-3 text-sm text-white/75">
                    {selectedResource.subject} · {selectedResource.gradeBand} ·{" "}
                    {selectedResource.format}
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="rounded-[1.25rem] bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                          What it is
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {selectedResource.format}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                          Best fit
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {selectedResource.subject} · {selectedResource.gradeBand}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                          Updated
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {selectedResource.updatedAt}
                        </p>
                      </div>
                    </div>

                    <WatermarkedPreviewStack
                      className="mt-0"
                      format={selectedResource.format}
                      gradeBand={selectedResource.gradeBand}
                      sellerName={selectedResource.sellerName}
                      standardsTag={selectedResource.standardsTag}
                      subject={selectedResource.subject}
                      summary={selectedResource.summary}
                      title={selectedResource.title}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-white/5 p-4">
                      <p className="text-sm leading-7 text-white/70">
                        {selectedResource.summary}
                      </p>
                      {selectedResource.sellerName ? (
                        <p className="mt-3 text-sm text-white/55">
                          Sold by {selectedResource.sellerName} {selectedResource.sellerHandle}
                        </p>
                      ) : null}
                    </div>

                    {selectedResource.priceCents ? (
                      <div className="rounded-[1.5rem] bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                              {selectedResourceCheckoutStatus === "live"
                                ? "Live marketplace checkout"
                                : selectedResourceCheckoutStatus === "onboarding_required"
                                  ? "Seller onboarding required"
                                  : "Connect seller payouts"}
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {formatCurrency(selectedResource.priceCents)}
                            </p>
                          </div>
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
                            disabled={isCheckingOut}
                            onClick={() => void handleCheckout(selectedResource)}
                            type="button"
                          >
                            <CreditCard className="h-4 w-4" />
                            {isCheckingOut
                              ? "Opening checkout"
                              : selectedResourceCheckoutStatus === "live"
                                ? "Buy resource"
                                : selectedResourceCheckoutStatus === "onboarding_required"
                                  ? "Preview checkout"
                                  : "Complete payouts first"}
                          </button>
                        </div>

                        <div
                          className={`mt-4 rounded-[1.25rem] border px-4 py-3 text-sm ${
                            selectedResourceCheckoutStatus === "live"
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                              : selectedResourceCheckoutStatus === "onboarding_required"
                                ? "border-amber-300/20 bg-amber-300/10 text-amber-50"
                                : "border-white/10 bg-white/5 text-white/75"
                          }`}
                        >
                          {selectedResourceCheckoutStatus === "live"
                            ? "This listing can open a live marketplace checkout flow right now."
                            : selectedResourceCheckoutStatus === "onboarding_required"
                              ? `This seller has started payout setup, but onboarding is still incomplete.${selectedSellerStatus?.requirements?.length ? ` Stripe is still requesting: ${selectedSellerStatus.requirements.slice(0, 2).join(", ")}.` : ""} You can still preview the purchase flow.`
                              : "This resource still needs seller payout setup before it can go live for real purchases."}

                          {selectedResourceCheckoutStatus === "onboarding_required" ? (
                            <div className="mt-3">
                              <button
                                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-70"
                                disabled={isOpeningResourceOnboarding}
                                onClick={() =>
                                  void handleExistingSellerOnboarding(selectedResource)
                                }
                                type="button"
                              >
                                {isOpeningResourceOnboarding
                                  ? "Opening onboarding"
                                  : "Finish seller onboarding"}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1.25rem] bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                              Seller earns
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {formatCurrency(calculateSellerPayout(selectedResource.priceCents))}
                            </p>
                            <p className="mt-1 text-xs text-white/55">
                              {getTeacherPayoutShareLabel()} of the sale before Stripe fees
                            </p>
                          </div>
                          <div className="rounded-[1.25rem] bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                              LessonForge keeps
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {formatCurrency(calculatePlatformFee(selectedResource.priceCents))}
                            </p>
                            <p className="mt-1 text-xs text-white/55">
                              40% platform commission
                            </p>
                          </div>
                        </div>

                        <details className="mt-4 rounded-[1.25rem] bg-white/5 p-4">
                          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                            Payment methods and payout details
                          </summary>
                          <div className="mt-3 grid gap-3">
                            {PAYMENT_METHOD_GROUPS.map((group) => (
                              <div key={group.title}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                  {group.title}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {group.methods.map((method) => (
                                    <span
                                      key={method}
                                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
                                    >
                                      {method}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-xs leading-6 text-white/55">
                            {selectedResourceCheckoutStatus === "live"
                              ? "Stripe Checkout shows eligible methods dynamically based on dashboard settings, currency, buyer location, and connected-account compatibility."
                              : selectedResourceCheckoutStatus === "onboarding_required"
                                ? "This listing stays in preview mode until the seller finishes payout onboarding."
                                : "This listing needs seller payout setup before it can use live checkout."}
                          </p>
                        </details>
                      </div>
                    ) : null}

                    {checkoutMessage ? (
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                        {checkoutMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

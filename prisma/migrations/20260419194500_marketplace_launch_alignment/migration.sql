DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'USER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM (
      'PENDING',
      'PAID',
      'FULFILLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'FAILED',
      'CANCELED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportCategory') THEN
    CREATE TYPE "ReportCategory" AS ENUM (
      'BROKEN_FILE',
      'COPYRIGHT',
      'MISLEADING_LISTING',
      'LOW_QUALITY',
      'SPAM',
      'ACCESS_ISSUE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModerationStatus') THEN
    CREATE TYPE "ModerationStatus" AS ENUM (
      'OPEN',
      'UNDER_REVIEW',
      'RESOLVED',
      'DISMISSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductAssetType') THEN
    CREATE TYPE "ProductAssetType" AS ENUM (
      'PDF',
      'DOCX',
      'PPTX',
      'XLSX',
      'IMAGE',
      'ZIP'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "role" "UserRole" DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON public."User" ("email");

CREATE TABLE IF NOT EXISTS public."SellerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeName" TEXT NOT NULL,
  "storeHandle" TEXT NOT NULL,
  "bio" TEXT,
  "onboardingCompletedAt" TIMESTAMP(3),
  "stripeAccountId" TEXT,
  "stripeOnboardingStatus" TEXT,
  "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "supportEmail" TEXT,
  "averageRating" DOUBLE PRECISION,
  "totalSalesCount" INTEGER NOT NULL DEFAULT 0,
  "totalRevenueCents" INTEGER NOT NULL DEFAULT 0,
  "conversionRate" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."SellerProfile"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "storeName" TEXT,
  ADD COLUMN IF NOT EXISTS "storeHandle" TEXT,
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeOnboardingStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supportEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "totalSalesCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalRevenueCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "conversionRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_userId_key" ON public."SellerProfile" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_storeHandle_key" ON public."SellerProfile" ("storeHandle");
CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_stripeAccountId_key" ON public."SellerProfile" ("stripeAccountId");

CREATE TABLE IF NOT EXISTS public."Order" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "platformFee" INTEGER NOT NULL DEFAULT 0,
  "sellerEarnings" INTEGER NOT NULL DEFAULT 0,
  "salesTaxAmount" INTEGER NOT NULL DEFAULT 0,
  "taxState" TEXT,
  "sellerShareCents" INTEGER NOT NULL DEFAULT 0,
  "platformShareCents" INTEGER NOT NULL DEFAULT 0,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "buyerId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "OrderStatus" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS "subtotalCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAmount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformFee" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sellerEarnings" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "salesTaxAmount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxState" TEXT,
  ADD COLUMN IF NOT EXISTS "sellerShareCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformShareCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeCheckoutSessionId_key" ON public."Order" ("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripePaymentIntentId_key" ON public."Order" ("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "Order_buyerId_status_idx" ON public."Order" ("buyerId", "status");

CREATE TABLE IF NOT EXISTS public."OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "licenseType" "LicenseType" NOT NULL DEFAULT 'SINGLE_CLASSROOM',
  "licenseSeatCount" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
  "sellerShareCents" INTEGER NOT NULL DEFAULT 0,
  "platformShareCents" INTEGER NOT NULL DEFAULT 0,
  "latestEligibleVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."OrderItem"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "sellerId" TEXT,
  ADD COLUMN IF NOT EXISTS "licenseType" "LicenseType" DEFAULT 'SINGLE_CLASSROOM',
  ADD COLUMN IF NOT EXISTS "licenseSeatCount" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "unitPriceCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sellerShareCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformShareCents" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "latestEligibleVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_productId_idx" ON public."OrderItem" ("orderId", "productId");

CREATE TABLE IF NOT EXISTS public."Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
  "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."Review"
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerId" TEXT,
  ADD COLUMN IF NOT EXISTS "orderItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "body" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" DEFAULT 'VISIBLE',
  ADD COLUMN IF NOT EXISTS "verifiedPurchase" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderItemId_key" ON public."Review" ("orderItemId");

CREATE TABLE IF NOT EXISTS public."Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."Favorite"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_productId_key" ON public."Favorite" ("userId", "productId");

CREATE TABLE IF NOT EXISTS public."Report" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "category" "ReportCategory" NOT NULL,
  "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
  "details" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."Report"
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "reporterId" TEXT,
  ADD COLUMN IF NOT EXISTS "category" "ReportCategory",
  ADD COLUMN IF NOT EXISTS "status" "ModerationStatus" DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "details" TEXT,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "gradeBand" TEXT;

CREATE TABLE IF NOT EXISTS public."ProductAsset" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "assetType" "ProductAssetType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalUrl" TEXT,
  "previewUrl" TEXT,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "mimeType" TEXT,
  "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "checksum" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."ProductAsset"
  ADD COLUMN IF NOT EXISTS "productId" TEXT,
  ADD COLUMN IF NOT EXISTS "assetType" "ProductAssetType",
  ADD COLUMN IF NOT EXISTS "storageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "fileName" TEXT,
  ADD COLUMN IF NOT EXISTS "originalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "previewUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "isPreview" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "fileSizeBytes" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ProductAsset_productId_versionNumber_idx" ON public."ProductAsset" ("productId", "versionNumber");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SellerProfile' AND column_name = 'userId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SellerProfile_userId_fkey') THEN
      ALTER TABLE public."SellerProfile"
        ADD CONSTRAINT "SellerProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES public."User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'buyerId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_buyerId_fkey') THEN
      ALTER TABLE public."Order"
        ADD CONSTRAINT "Order_buyerId_fkey"
        FOREIGN KEY ("buyerId") REFERENCES public."User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'OrderItem' AND column_name = 'orderId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey') THEN
      ALTER TABLE public."OrderItem"
        ADD CONSTRAINT "OrderItem_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES public."Order"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'OrderItem' AND column_name = 'productId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey') THEN
      ALTER TABLE public."OrderItem"
        ADD CONSTRAINT "OrderItem_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES public."Product"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'productId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_productId_fkey') THEN
      ALTER TABLE public."Review"
        ADD CONSTRAINT "Review_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES public."Product"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ProductAsset' AND column_name = 'productId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAsset_productId_fkey') THEN
      ALTER TABLE public."ProductAsset"
        ADD CONSTRAINT "ProductAsset_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES public."Product"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'buyerId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_buyerId_fkey') THEN
      ALTER TABLE public."Review"
        ADD CONSTRAINT "Review_buyerId_fkey"
        FOREIGN KEY ("buyerId") REFERENCES public."User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'orderItemId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'OrderItem' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_orderItemId_fkey') THEN
      ALTER TABLE public."Review"
        ADD CONSTRAINT "Review_orderItemId_fkey"
        FOREIGN KEY ("orderItemId") REFERENCES public."OrderItem"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Favorite' AND column_name = 'userId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_userId_fkey') THEN
      ALTER TABLE public."Favorite"
        ADD CONSTRAINT "Favorite_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES public."User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Favorite' AND column_name = 'productId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_productId_fkey') THEN
      ALTER TABLE public."Favorite"
        ADD CONSTRAINT "Favorite_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES public."Product"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Report' AND column_name = 'productId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_productId_fkey') THEN
      ALTER TABLE public."Report"
        ADD CONSTRAINT "Report_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES public."Product"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Report' AND column_name = 'reporterId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_reporterId_fkey') THEN
      ALTER TABLE public."Report"
        ADD CONSTRAINT "Report_reporterId_fkey"
        FOREIGN KEY ("reporterId") REFERENCES public."User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

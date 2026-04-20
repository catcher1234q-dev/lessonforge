type AppEnv = {
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_APP_URL: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  LESSONFORGE_PERSISTENCE_MODE: "json" | "auto" | "prisma";
  LESSONFORGE_OWNER_ACCESS_CODE: string;
  LESSONFORGE_ADMIN_ACCESS_CODE: string;
  LESSONFORGE_ACCESS_COOKIE_SECRET: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
  SUPABASE_SITE_URL: string;
  SUPABASE_REDIRECT_URLS: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  FEATURE_AI_ENABLED: boolean;
  FEATURE_DEMO_MODE: boolean;
  FEATURE_STRIPE_ENABLED: boolean;
  FEATURE_REVIEWS_ENABLED: boolean;
  FEATURE_REFUNDS_ENABLED: boolean;
  FEATURE_ADMIN_ENABLED: boolean;
  DEV_GRANT_PURCHASE_ENABLED: boolean;
  AI_KILL_SWITCH: boolean;
  AI_DEFAULT_TIMEOUT_MS: number;
  AI_MAX_INPUT_CHARACTERS: number;
  AI_MAX_FILE_SIZE_BYTES: number;
  PLAN_STARTER_CREDITS: number;
  PLAN_BASIC_MONTHLY_CREDITS: number;
  PLAN_PRO_MONTHLY_CREDITS: number;
  SEARCH_FRESHNESS_WINDOW_DAYS: number;
};

function readString(name: string, fallback = "") {
  const value = process.env[name];

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function readNumber(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export const env: AppEnv = {
  NEXT_PUBLIC_APP_NAME: readString("NEXT_PUBLIC_APP_NAME", "LessonForge"),
  NEXT_PUBLIC_APP_URL: readString("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  DATABASE_URL: readString("DATABASE_URL"),
  DIRECT_URL: readString("DIRECT_URL"),
  LESSONFORGE_OWNER_ACCESS_CODE: readString("LESSONFORGE_OWNER_ACCESS_CODE"),
  LESSONFORGE_ADMIN_ACCESS_CODE: readString("LESSONFORGE_ADMIN_ACCESS_CODE"),
  LESSONFORGE_ACCESS_COOKIE_SECRET: readString("LESSONFORGE_ACCESS_COOKIE_SECRET"),
  LESSONFORGE_PERSISTENCE_MODE: (readString(
    "LESSONFORGE_PERSISTENCE_MODE",
    "auto",
  ) || "auto") as AppEnv["LESSONFORGE_PERSISTENCE_MODE"],
  NEXT_PUBLIC_SUPABASE_URL: readString(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://your-project-ref.supabase.co",
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readString(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "your-anon-key",
  ),
  SUPABASE_SERVICE_ROLE_KEY: readString(
    "SUPABASE_SERVICE_ROLE_KEY",
    "your-service-role-key",
  ),
  STRIPE_SECRET_KEY: readString("STRIPE_SECRET_KEY", "sk_test_replace_me"),
  STRIPE_WEBHOOK_SECRET: readString(
    "STRIPE_WEBHOOK_SECRET",
    "whsec_replace_me",
  ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: readString(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "pk_test_replace_me",
  ),
  NEXT_PUBLIC_SITE_URL: readString("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  SUPABASE_SITE_URL: readString("SUPABASE_SITE_URL", "http://localhost:3000"),
  SUPABASE_REDIRECT_URLS: readString(
    "SUPABASE_REDIRECT_URLS",
    "http://localhost:3000,http://localhost:3000/auth/callback",
  ),
  SMTP_HOST: readString("SMTP_HOST"),
  SMTP_PORT: readNumber("SMTP_PORT", 587),
  SMTP_USER: readString("SMTP_USER"),
  SMTP_PASS: readString("SMTP_PASS"),
  EMAIL_FROM: readString("EMAIL_FROM", "no-reply@lessonforgehub.com"),
  FEATURE_AI_ENABLED: readBoolean("FEATURE_AI_ENABLED", true),
  FEATURE_DEMO_MODE: readBoolean("FEATURE_DEMO_MODE", false),
  FEATURE_STRIPE_ENABLED: readBoolean("FEATURE_STRIPE_ENABLED", true),
  FEATURE_REVIEWS_ENABLED: readBoolean("FEATURE_REVIEWS_ENABLED", true),
  FEATURE_REFUNDS_ENABLED: readBoolean("FEATURE_REFUNDS_ENABLED", true),
  FEATURE_ADMIN_ENABLED: readBoolean("FEATURE_ADMIN_ENABLED", true),
  DEV_GRANT_PURCHASE_ENABLED: readBoolean("DEV_GRANT_PURCHASE_ENABLED", false),
  AI_KILL_SWITCH: readBoolean("AI_KILL_SWITCH", false),
  AI_DEFAULT_TIMEOUT_MS: readNumber("AI_DEFAULT_TIMEOUT_MS", 30_000),
  AI_MAX_INPUT_CHARACTERS: readNumber("AI_MAX_INPUT_CHARACTERS", 12_000),
  AI_MAX_FILE_SIZE_BYTES: readNumber("AI_MAX_FILE_SIZE_BYTES", 10_000_000),
  PLAN_STARTER_CREDITS: readNumber("PLAN_STARTER_CREDITS", 5),
  PLAN_BASIC_MONTHLY_CREDITS: readNumber("PLAN_BASIC_MONTHLY_CREDITS", 100),
  PLAN_PRO_MONTHLY_CREDITS: readNumber("PLAN_PRO_MONTHLY_CREDITS", 300),
  SEARCH_FRESHNESS_WINDOW_DAYS: readNumber("SEARCH_FRESHNESS_WINDOW_DAYS", 14),
};

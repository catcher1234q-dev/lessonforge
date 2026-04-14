# Vercel Launch Setup

This guide is for getting LessonForge from local development into a real Vercel project in a simple, founder-friendly way.

## What Vercel Does

Vercel hosts the website so people can open it on the internet.

For LessonForge, Vercel will handle:

- the public website
- server routes like checkout and webhooks
- automatic builds when the code changes

Vercel does not replace:

- Stripe
- Supabase
- your database

Those still need their own setup and environment values.

## Best Launch Order

Use this order:

1. Create or claim the Vercel project.
2. Add the environment variables.
3. Deploy a preview.
4. Test sign-in, seller pages, checkout, and admin privacy.
5. Point Stripe webhooks at the Vercel site.
6. Promote to production only after the preview works.

## The Main Environment Variables

These are the most important Vercel environment values for LessonForge.

### Required For The Site To Behave Like A Real App

- `NEXT_PUBLIC_APP_URL`
  Use your Vercel site URL, for example `https://your-site.vercel.app`
- `LESSONFORGE_ACCESS_COOKIE_SECRET`
  Use a long random secret
- `NEXT_PUBLIC_SUPABASE_URL`
  Comes from your Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Comes from your Supabase project
- `DATABASE_URL`
  Use your real Postgres connection string when you want live database-backed data

### Required For Real Buyer Payments

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Required For Real Seller Payouts

- `STRIPE_CONNECT_WEBHOOK_SECRET`

If you still use direct connected-account env values during transition, also set any seller account ids you rely on, such as:

- `STRIPE_CONNECTED_ACCOUNT_AVERY`
- `STRIPE_CONNECTED_ACCOUNT_MONICA`
- `STRIPE_CONNECTED_ACCOUNT_THEO`
- `STRIPE_CONNECTED_ACCOUNT_PRIYA`

### Required For Private Founder Access

- `LESSONFORGE_OWNER_ACCESS_CODE`

Optional:

- `LESSONFORGE_ADMIN_ACCESS_CODE`

Use that only if you want a trusted coworker to access admin tools without giving them owner power.

## Safe First Vercel Setup

If you want the fastest safe first deployment, set these first:

- `NEXT_PUBLIC_APP_URL`
- `LESSONFORGE_ACCESS_COOKIE_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LESSONFORGE_OWNER_ACCESS_CODE`

That gives you:

- a real hosted website
- private owner access
- real sign-in support

Then add Stripe and database values when you are ready for real payments and persistence.

## Stripe Webhook URLs To Add Later

When the Vercel site is ready for real money flow, Stripe should send webhooks to:

- `https://your-site.vercel.app/api/stripe/webhook`

If seller payout onboarding is live, Stripe Connect webhooks should also point to:

- the Connect webhook route you use in production

## What To Test On The Preview Deployment

Before calling the site launch-ready, test:

1. Homepage, marketplace, product page, and account page all load.
2. Sign-in works and private account pages do not show to logged-out visitors.
3. Seller onboarding opens correctly.
4. Seller dashboard and product creation pages load for a signed-in seller.
5. Owner access stays private and normal visitors do not see owner/admin entry points.
6. Checkout uses the correct path:
   - preview fallback if Stripe is not fully configured
   - real Stripe Checkout if Stripe is fully configured

## The Most Common Mistakes

Avoid these:

- leaving `NEXT_PUBLIC_APP_URL` as `http://localhost:3000`
- launching with placeholder Stripe keys
- launching with the placeholder cookie secret
- forgetting to add Supabase keys
- forgetting to update Stripe webhook URLs after going live

## What “Launch Ready” Means Here

LessonForge should be considered launch ready on Vercel only when:

- the site builds successfully on Vercel
- private buyer and seller pages require real sign-in
- owner access is hidden from the public
- Stripe Checkout works with real keys
- Stripe webhook events create order records correctly
- seller payout onboarding opens real Stripe onboarding
- your production URL is used in app settings and Stripe settings

## What To Review Next

After Vercel setup, the best founder review pass is:

- homepage
- marketplace
- product page
- sign-in and account page
- seller onboarding
- seller dashboard
- owner access privacy

Then do the Stripe and webhook check last, because that is the highest-risk part of launch.

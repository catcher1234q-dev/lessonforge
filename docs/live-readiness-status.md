# Live Readiness Status

This page explains what already works on the live LessonForge website and what still depends on real Supabase and Stripe setup.

Use this as the simple founder checklist before launch testing.

## What Already Works On The Live Site

These parts of the website can already be reviewed safely:

- homepage
- marketplace browsing
- product pages
- pricing display
- favorites and library entry pages
- seller entry pages
- protected routes refusing anonymous checkout and download access

The site is also behaving more like a real product now:

- production header shows `Log in` and `Create account` instead of demo buyer and seller toggles
- buy buttons try the real checkout route first
- if real account setup is still missing, the site falls back to the safer preview flow instead of pretending checkout is live
- private account screens now explain setup status in plain language instead of showing developer-style env var errors

## What Still Needs Real Setup Before Full End-To-End Testing

These parts are not truly live until the real keys and services are connected:

- Supabase sign up
- Supabase log in
- session persistence across refresh
- Stripe Checkout
- Stripe webhooks
- order records saved in Supabase
- buyer library unlock after payment
- seller subscription activation
- seller payout onboarding through Stripe Connect

## The Exact Environment Values Still Needed

For account login:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `LESSONFORGE_ACCESS_COOKIE_SECRET`

For buyer and seller payments:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

For seller payouts:

- `STRIPE_CONNECT_WEBHOOK_SECRET`

## What You Should Review Next

Once the real Supabase values are added in Vercel:

1. Open the live site.
2. Confirm the header shows `Log in` and `Create account`.
3. Create a real test account.
4. Refresh the page and confirm you stay signed in.
5. Open `/account`, `/library`, and `/sell`.

Once the real Stripe values are added:

1. Start a test checkout from a real product page.
2. Complete a Stripe test payment.
3. Confirm the webhook reaches the live webhook route.
4. Confirm the purchased item appears in the buyer library.
5. Confirm protected delivery opens only for the signed-in buyer who paid.

## Important Security Note

Some Stripe and Supabase keys were pasted into chat earlier.

Treat those values as exposed.

Before production launch:

- rotate all exposed Stripe keys
- rotate all exposed Supabase keys
- update Vercel with the new replacement values
- do one fresh end-to-end payment test after rotation

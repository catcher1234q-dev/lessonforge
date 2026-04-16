# Production Auth And Email Setup

This project is now prepared to use a real production domain and a custom email sender, but the final switch still happens in Supabase and your email provider dashboard.

## What this fixes

- Login emails can be sent to real customers instead of only project team members.
- Magic links and OAuth callbacks point to the real LessonForge domain.
- Founder-facing auth links stay consistent between the website and Supabase.

## Environment variables

Add these to local `.env.local` and to Vercel:

- `NEXT_PUBLIC_SITE_URL=https://lessonforgehub.com`
- `SUPABASE_SITE_URL=https://lessonforgehub.com`
- `SUPABASE_REDIRECT_URLS=https://lessonforgehub.com,https://lessonforgehub.com/auth/callback`
- `EMAIL_FROM=no-reply@lessonforgehub.com`
- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=your-provider-smtp-password`

## Supabase dashboard steps

1. Open Supabase, then go to `Authentication -> URL Configuration`.
2. Set `Site URL` to `https://lessonforgehub.com`.
3. Add both redirect URLs:
   - `https://lessonforgehub.com`
   - `https://lessonforgehub.com/auth/callback`
4. Open `Authentication -> SMTP Settings`.
5. Turn on custom SMTP.
6. Enter the matching SMTP host, port, username, password, and sender email.
7. Save the settings.

Supabase’s redirect URL guide explains that `redirectTo` values must match the allow-list in URL Configuration, and its custom SMTP guide explains that real customer email delivery requires your own SMTP provider rather than the default sender.

Sources:

- [Supabase custom SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase redirect URL docs](https://supabase.com/docs/guides/auth/redirect-urls)

## DNS records you still need

If you use Resend, their docs say domain verification requires SPF and DKIM first, and DMARC should be added after that to strengthen trust.

You will need:

- `SPF`
  - Usually a TXT record provided by your email service.
- `DKIM`
  - Usually one or more provider-specific DNS records from your email service dashboard.
- `DMARC`
  - Start with a TXT record like `v=DMARC1; p=none; rua=mailto:dmarcreports@lessonforgehub.com;`

Important:

- The exact SPF and DKIM values come from your email provider dashboard.
- Do not guess or hand-type the DKIM values.
- DMARC can start with `p=none` while you test deliverability.

Sources:

- [Resend domain docs](https://resend.com/docs/dashboard/domains/introduction)
- [Resend DMARC docs](https://resend.com/docs/dashboard/domains/dmarc)

## Manual test after setup

1. Redeploy the site after env vars are added.
2. Open the live site.
3. Click `Create account`.
4. Enter a real test email.
5. Confirm the email arrives from `no-reply@lessonforgehub.com`.
6. Open the magic link.
7. Confirm you land back on `https://lessonforgehub.com/auth/callback`.
8. Refresh the page and confirm you stay signed in.

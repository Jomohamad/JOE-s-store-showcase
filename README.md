# JOE Store

JOE Store is a Next.js 15 storefront for digital game currency and top-ups. Supabase Auth manages customer sessions; Supabase PostgreSQL stores the catalog, scheduled offers, orders, and store content. The browser uses the publishable key and RLS. Checkout pricing is recalculated inside a restricted database function.

## Requirements and stack

- Node.js 20.9 or newer and npm
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage, and `@supabase/ssr`
- A Supabase project for connected auth/data flows

## Install and run

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set the values in `.env.local` before using authentication, the catalog API, admin tools, or checkout. The app uses `http://localhost:3000` by default for local callback URLs.

## Environment variables

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase project API URL from Project Settings > API. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Public | Supabase publishable key for browser and SSR clients. RLS protects data access. |
| `NEXT_PUBLIC_SITE_URL` | Yes for canonical URLs | Public | Local or deployed site origin used by metadata, robots, and sitemap. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only | Reserved for future trusted server jobs. This application does not use it. Never prefix it with `NEXT_PUBLIC_` or commit a real value. |
| `PAYMENT_PROVIDER` | No | Server-only | Payment adapter selector. The included `mock` adapter is development-only and refuses production. |
| `PAYMENT_SECRET` | No | Server-only | Reserved for a real payment adapter; never put payment credentials in browser code. |
| `RESEND_API_KEY` | Required for newsletter sending | Server-only | Resend API key for confirmation and campaigns. |
| `RESEND_FROM_EMAIL` | Required for newsletter sending | Server-only | Verified sender identity. |

Do not add database passwords or Supabase secret/service-role keys to `.env.example`. Never commit `.env`, `.env.local`, or production credentials. The app connects to checkout through authenticated Supabase RPC functions; no direct database URL or elevated Prisma role is required.

## Supabase project setup

The configured project is **JOE-s-store** (`ljmgvyvbvinrcdmxptrx`, `eu-west-1`). In Supabase Project Settings > API, copy its project URL and publishable key into `.env.local`.

### Apply migrations to the existing project

```bash
npx supabase login
npx supabase link --project-ref ljmgvyvbvinrcdmxptrx
npx supabase migration list --linked
npx supabase db push --linked --include-seed
```

The existing project history also includes the storefront auth, schema, and security migrations. This work applied `20261008184732_auth_storefront_newsletter_improvements` and `20261008185014_harden_newsletter_and_public_sales` to the connected project. The follow-up migrations preserve the unused Prisma tables under the non-exposed `legacy` schema, move private functions out of `public`, add settings, payments, fulfillment, coupon usage, and banner support, and lock down the profile trigger function. They do not drop or truncate rows.

### Fresh Supabase project

Choose one setup path:

- Recommended: link the new project and run the migration commands above.
- SQL Editor: run `supabase/full_schema.sql` once on a fresh project, then run `supabase/seed.sql` if you want starter catalog records.

Do not run `full_schema.sql` on the already-migrated project, and do not run it in addition to `db push`; it is a complete snapshot for fresh databases. The seed file is separate and repeatable: it upserts the starter settings, categories, games, and products, and adds its sample offers only when they do not already exist. It resets matching starter rows to the values in the seed, so treat those sample records as development content.

### Supabase Auth dashboard configuration

SQL creates the database trigger and policies; provider and URL settings live in the Supabase Dashboard:

1. Authentication > URL Configuration: set Site URL to the canonical production origin currently assigned in Vercel. Add `http://localhost:3000/**` and the canonical production origin plus `/auth/callback` to the redirect allow list. Use `http://localhost:3000` for local passkey enrollment, not `127.0.0.1`.
2. Authentication > Providers: enable Email, require email confirmation, use a minimum password length of 12 and require lowercase, uppercase, digits, and symbols. Enable secure password changes.
3. For Google sign-in, create a Web OAuth client in Google Cloud, add `https://ljmgvyvbvinrcdmxptrx.supabase.co/auth/v1/callback` as its authorized redirect URI, then enable Google in Supabase and paste the Google client ID and secret. The same callback URI is used regardless of the storefront domain.
4. Authentication > Passkeys: enable passkeys using the canonical production hostname as RP ID and its HTTPS origin. Local development uses `localhost` and `http://localhost:3000`. Keep the RP ID stable after customers register passkeys. The store offers passkey sign-in and account-level enrollment/removal.
5. Authentication > Email Templates: copy the templates from `supabase/templates/` into the corresponding Confirmation, Recovery, Magic Link, Email Change, Invite, Reauthentication, and password/email change notification templates. `supabase/config.toml` configures these for local Supabase development; hosted project templates must be saved in the Dashboard.
6. Configure a production SMTP provider in Authentication > SMTP Settings for reliable confirmation and recovery delivery. The default sender is rate-limited and is not suitable for normal production traffic.
7. Password recovery uses the same `/auth/callback` route and returns to `/reset-password`.

The app implements email/password signup and login, Google OAuth, session refresh, sign-out, password reset, and account access. Auth passwords are stored only by Supabase Auth, never in `profiles`.

## First administrator

Register the owner through `/register`, confirm the email if confirmation is enabled, then promote that existing account once in the Supabase SQL Editor:

```sql
insert into public.admin_users (user_id) select id from auth.users where email = 'owner@example.com' on conflict (user_id) do nothing;
```

Admin checks use the verified Supabase Auth user plus a row in `public.admin_users`. Editable user metadata is never used for authorization. There is no public admin promotion endpoint. After bootstrap, use `/admin`, `/admin/categories`, `/admin/offers`, `/admin/promotions`, and `/admin/newsletter` to manage content. The connected project currently has zero admin memberships.

## Database model

The schema is lowercase and follows the app's current catalog and checkout model:

- `profiles`, `admin_users`
- `categories`, `games`, `products`, `offers`, and the time-filtered `active_offers` view
- `site_settings`, `promo_banners`, `testimonials`
- `coupons`, `coupon_usages`
- `orders`, `order_items`, `payments`, `fulfillments`
- `audit_logs`

Each product row is already one purchasable pack with its own amount and price, so a separate variants table would duplicate the current model. Wishlist and review tables are not included because those flows are not part of the current storefront. The earlier Auth.js/Prisma tables are retained in `legacy` for compatibility, with no Data API access; they are not used by the app.

`profiles` is created by an `auth.users` trigger. The `private` schema holds security-definer functions with fixed search paths and restricted execute grants. Public storefront data is readable under RLS; customer order, payment, and coupon-usage reads are restricted to the owning account; content writes require an admin membership row. Payment and fulfillment data is not public.

### Scheduled offers

Offer visibility is based on `is_active`, `starts_at`, and `ends_at`. The `active_offers` view uses database time and `security_invoker = true`; expired offers need no manual status update. Checkout independently reloads the active product and best applicable offer before storing prices and snapshots.

### Storage

The migration creates the public-read `store-media` bucket for storefront images. Only administrators can upload, replace, or delete objects. Do not store credentials or customer payment data in the bucket.

## Admin and normal operations

- `/admin`: edit games, products, coupons, testimonials, and site settings; view order and revenue metrics.
- `/admin/categories`: create, edit, reorder, disable, and search categories.
- `/admin/offers`: schedule discounts by product, game, or category; filter scheduled, active, expired, or disabled offers.
- Database records are the source of truth. The storefront refreshes catalog data periodically and after admin edits.

The store now includes a promotions carousel/admin editor, coupon validation in checkout, confirmed newsletter subscriptions and admin campaigns, a dynamic sales aggregate, and editable account contact details. Real payment processing and automated top-up delivery still require a production payment and fulfillment provider; the included mock payment adapter refuses production payments.

## Development checks

```bash
npm run lint
npm run typecheck
npm run build
```

Create schema changes with `npx supabase migration new descriptive_name`, update the SQL, then apply and inspect them with `npx supabase db push --linked` and `npx supabase migration list --linked`. Run the Supabase security advisor after schema changes. Keep schema snapshots and migrations in sync.

## Deployment

For Vercel, add the three required public variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`) to Preview and Production. The optional service-role and payment secrets are server-only. Apply migrations to the intended Supabase project, add the deployed callback URL to Supabase Auth, then verify registration, confirmation, Google OAuth, admin access, catalog reads, and order pricing.

Do not enable production checkout until a real payment adapter and signed webhook verification are implemented. Do not claim digital delivery until an approved fulfillment provider is connected. Review support/contact information, legal copy, regional pricing, and licensed artwork before launch.

## Troubleshooting

- **Supabase connection fails:** check the project URL and publishable key, restart Next.js after changing `.env.local`, and confirm the project is active.
- **RLS permission denied:** verify migrations were applied to the same project and that the request is authenticated/admin as required. Do not solve this by adding the service-role key to a browser client.
- **Admin access denied:** confirm the signed-in email exists in `auth.users` and its ID is present in `public.admin_users`.
- **OAuth redirect error:** add the exact callback origin in Supabase URL Configuration and verify Google Cloud's Supabase callback URI.
- **Password reset does not return to the app:** allow the callback URL and enable email auth/SMTP in Supabase.
- **Image upload fails:** check the `store-media` bucket, file type/size, admin membership, and storage policies.
- **Migration mismatch:** inspect `npx supabase migration list --linked`; use migrations for an existing database and `full_schema.sql` only for a fresh one.
- **Expired offer remains visible:** check database timestamps/time zone, `is_active`, and that the app is using the `active_offers` view.
- **Environment changes are ignored:** ensure the file is named `.env.local`, restart the dev server, and keep it out of Git.

 See [SETUP_REQUIRED.md](SETUP_REQUIRED.md) for provider setup, email templates/SMTP, newsletter sender setup, phone verification, and dashboard settings that still need provider credentials.

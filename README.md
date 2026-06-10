# Tollysplit

**Split shared expenses without the fuss.** Create a split, share the link, and
let everyone add what they paid. Balances and who-owes-whom are calculated
automatically — with one-tap Swish payments straight from the balance view.

🔗 **Live:** [tollysplit.xuper.fun](https://tollysplit.xuper.fun)

🌍 **Languages:** English · [Svenska](README.sv.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-0d9488.svg)](LICENSE)
&nbsp;Next.js 16 · Supabase · Tailwind v4

---

## Features

- **No account needed** to create or use a split — the secret link *is* the
  key. Optional email sign-in just makes your splits follow you across devices.
- **Flexible splitting:** equal, weighted shares, or exact amounts, with cent
  rounding handled by the largest-remainder method.
- **Smart settlements:** the minimum number of payments ("A pays B X kr"),
  bookable as transfers.
- **Payments built for the Nordics** — see below.
- **Dark / light / system theme**, privacy & cookie policy, cookie-less
  analytics.

## 🇸🇪 Payments — Swish first

Tollysplit leans into the **Swedish market**: when a split is in SEK and the
recipient has saved a Swish number, every settlement row gets a **"Swisha"
button** that shows a prefilled QR code (recipient, exact amount, and the split
name as the message) and an **"Open Swish"** deep link that launches the app
with everything filled in on mobile. One tap, done.

This works because **Swish exposes a genuinely open, agreement-free API** — a
public prefilled deep link (`app.swish.nu`) and a public QR endpoint. No
merchant contract, no API keys, no fuss. It's refreshingly developer-friendly.

Sadly, the **other Nordic wallets don't offer the same.** Vipps (Norway) and
MobilePay (Denmark/Finland, both now Vipps MobilePay) only expose
amount-prefilled flows through their **merchant ePayment/QR APIs, which require
a business agreement, credentials, and route money to a company** rather than
person-to-person. The only public artifact is a personal QR that encodes a
phone number but carries no amount. So for Vipps, MobilePay and IBAN, Tollysplit
does the honest thing: it stores the payment handle and shows it with a
**copy button** next to the amount, so the payer can finish in their own app.
If Vipps or MobilePay ever ship a Swish-style open P2P deep link, wiring it in
is a small change — PRs welcome. 🤞

## Architecture

- **No service-role key in the app.** All data access goes through
  `security definer` Postgres RPCs (`split_data`, `save_entry`, …) where the
  secret split key in the URL is the capability. RLS is enabled with no
  policies (deny-all) on every table and direct grants are revoked — the app
  only ever holds the public publishable key. The full schema lives in
  [`supabase/migrations/`](supabase/migrations).
- **Next.js App Router** + server actions; the client is plain React with no
  state library. Tailwind v4.
- **Privacy by design:** payment details are wiped once everyone is square,
  inactive splits are purged after 6 months, and the spam-protection IP hash is
  deleted within a day.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase URL + anon key
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
```

## Deploy your own

Tollysplit is built to be self-hostable on the free tiers of Supabase + Vercel.

### 1. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (the EU regions
   keep data in Europe).
2. Apply the schema: open the **SQL Editor** and run the contents of
   [`supabase/migrations/20260610000000_baseline_schema.sql`](supabase/migrations),
   or use the CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
3. Grab **Project URL** and the **publishable (anon) key** from
   *Project Settings → API*.
4. *(Optional, for email sign-in)* Configure SMTP under *Authentication →
   Emails* (e.g. a free [Resend](https://resend.com) account) and set the
   **Site URL** + a `…/auth/confirm` redirect under *Authentication → URL
   Configuration*. Sign-in is entirely optional — the app works without it.

### 2. Vercel (hosting)

1. Import the repo at [vercel.com](https://vercel.com/new).
2. Add the two environment variables (Production, Preview, Development):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   Both are safe to expose — security relies on RLS + RPCs, not on hiding them.
3. Deploy. That's it.

### 3. Custom domain via Cloudflare (optional)

1. In Vercel, add your domain under *Project → Settings → Domains*.
2. In Cloudflare DNS, add a **CNAME** for your subdomain pointing to
   `cname.vercel-dns.com`. Set it to **DNS-only (grey cloud)** so Vercel can
   issue the TLS certificate cleanly.
3. Add the same domain's `…/auth/confirm` URL to the Supabase redirect
   allowlist if you use email sign-in.

## Tests

The split, balance and settlement logic in `src/lib/money.ts` is pure
TypeScript and can be smoke-tested with `node --experimental-strip-types`.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

If Tollysplit saved your group some bickering, you can

[![Buy me a beer](https://img.shields.io/badge/Buy%20me%20a%20beer-%F0%9F%8D%BA-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/xuperfun)

*built with love, coffee and beer*

</div>

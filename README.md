# tollesplit

Kittysplit-klon för att dela utgifter i grupp — byggd med Next.js 16 och
Supabase. Live på [tollesplit.vercel.app](https://tollesplit.vercel.app).

## Hur den funkar

- **Skapa** en tollesplit (kräver inloggning, gated via `allowed_creators`-
  tabellen — just nu bara johan@tollstorp.se). Inloggning sker med magisk
  länk via Supabase Auth (PKCE — länken måste öppnas i samma webbläsare som
  begärde den). OTP-kod i mejlet kräver egen SMTP (free tier tillåter inte
  malländringar); kodfältet i UI:t fungerar då direkt.
- **Dela länken** `/k/<hemlig-nyckel>` — alla med länken kan lägga in
  utgifter och överföringar utan konto, precis som Kittysplit.
- **Saldon** räknas ut automatiskt med minimerade avräkningsförslag
  ("A betalar B X kr") som kan bokföras som överföringar.

Delning stödjer lika delning, andelar (viktad) och exakta belopp, med
öresfördelning enligt största-rest-metoden.

## Arkitektur

- **Ingen service-role-nyckel.** All dataåtkomst går via security definer-
  RPC:er i Postgres (`create_kitty`, `kitty_data`, `save_entry`, …) där den
  hemliga nyckeln i URL:en är capability. RLS är aktiverat utan policies
  (deny all) på samtliga tabeller — appen använder enbart den publika
  publishable-nyckeln.
- Next.js App Router + server actions; klienten är ren React utan
  state-bibliotek. Tailwind v4.
- Supabase-projekt: `uvlgfszbmzdurjlbqovu` (eu-north-1), org molnkontakt.
- Vercel-projekt: `molnkontakt/tollesplit`, deploy via `vercel deploy --prod`
  (ingen git-integration ännu).

## Lokal utveckling

```bash
npm install
npm run dev
```

`.env.local` behöver:

```
NEXT_PUBLIC_SUPABASE_URL=https://uvlgfszbmzdurjlbqovu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

## Logiktester

Split-/saldo-/avräkningslogiken i `src/lib/money.ts` är ren TS och kan
snabbtestas med `node --experimental-strip-types` (se test i git-historiken).

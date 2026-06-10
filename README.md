# tollesplit

Kittysplit-klon för att dela utgifter i grupp — byggd med Next.js 16 och
Supabase. Live på [tollysplit.xuper.fun](https://tollysplit.xuper.fun)
(primär) och [tollesplit.vercel.app](https://tollesplit.vercel.app).
DNS: CNAME i Cloudflare (zon xuper.fun, DNS-only) → `cname.vercel-dns.com`;
token finns i Phase-appen `homelab` (`CLOUDFLARE_DNS_TOKEN`).

## Hur den funkar

- **Skapa** en tollysplit — ingen inloggning krävs (kittysplit-modellen,
  sedan 2026-06-10). Spam-broms: max 10 skapade/timme per IP-hash och
  100/timme globalt (i `create_kitty`). Inloggning (mejl + engångskod via
  Resend-SMTP) är *valfri* och gör bara att ens splits följer med mellan
  enheter; utan den listas besökta splits per enhet via localStorage
  (`tollysplit:visited`). Obs: /auth/confirm är en sida med knapp eftersom
  M365 Safe Links förhandsklickar länkar och annars förbrukar engångstoken.
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

## Swish

Deltagare kan lägga in sitt Swish-nummer (Inställningar eller bannern i
saldovyn). Avräkningsrader får då en "Swisha"-knapp (endast SEK) som visar
förifylld QR-kod (Swish publika QR-API, proxat via `/api/swish-qr`) och en
`app.swish.nu`-länk som öppnar Swish-appen direkt på mobil. Riktiga pushade
betalningsförfrågningar kräver Swish Handel (företagsavtal + certifikat) och
är medvetet bortvalt.

# Tollysplit

Dela utgifter i grupp utan krångel — byggt med Next.js 16 och Supabase.
Skapa en split, dela länken, och låt alla lägga in sina utlägg. Saldon och
vem-betalar-vem räknas ut automatiskt, med Swish-betalning direkt från
saldovyn.

## Funktioner

- **Inget konto behövs** för att skapa eller använda en split — den hemliga
  länken är hela nyckeln. Valfri e-postinloggning gör att dina splits följer
  med mellan enheter.
- **Flexibel delning:** lika, viktade andelar eller exakta belopp, med
  öresfördelning enligt största-rest-metoden.
- **Smarta avräkningar:** minimerat antal betalningar ("A betalar B X kr"),
  bokförbara som överföringar.
- **Swish:** deltagare kan lägga in sitt nummer och få en förifylld QR-kod
  + app-länk på varje avräkningsrad (endast SEK).
- **Mörkt/ljust läge**, svensk UI, integritets- & cookiepolicy.

## Arkitektur

- **Ingen service-role-nyckel i appen.** All dataåtkomst går via
  `security definer`-RPC:er i Postgres (`kitty_data`, `save_entry`, …) där den
  hemliga nyckeln i URL:en är capability. RLS är aktiverat utan policies
  (deny-all) på samtliga tabeller och direkt-grants är återkallade — appen
  använder enbart den publika publishable-nyckeln. Hela schemat finns i
  [`supabase/migrations/`](supabase/migrations).
- **Next.js App Router** + server actions; klienten är ren React utan
  state-bibliotek. Tailwind v4.
- **Integritet by design:** Swish-nummer raderas när alla är kvitt, splits
  utan aktivitet gallras efter 6 månader, IP-hashar (spamskydd) raderas inom
  ett dygn.

## Kom igång

```bash
npm install
cp .env.example .env.local   # fyll i din egen Supabase-URL och anon-nyckel
npm run dev
```

`.env.local` behöver:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ditt-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<din publishable key>
```

Applicera databasschemat genom att köra migrationen i `supabase/migrations/`
mot ditt Supabase-projekt (t.ex. via `supabase db push` eller dashboardens
SQL-editor).

## Tester

Split-, saldo- och avräkningslogiken i `src/lib/money.ts` är ren TypeScript
och kan snabbtestas med `node --experimental-strip-types`.

## Swish

Pushade betalningsförfrågningar (notis direkt i mottagarens app) kräver Swish
Handel med företagsavtal och certifikat, och är medvetet bortvalt. Istället
används Swish publika app-länkar (`app.swish.nu`) och QR-API:t (proxat via
`/api/swish-qr`), som fungerar person-till-person utan avtal.

## Licens

MIT — se [LICENSE](LICENSE).

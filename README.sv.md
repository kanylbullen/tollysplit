# Tollysplit

**Dela utgifter i grupp utan krångel.** Skapa en split, dela länken och låt
alla lägga in vad de betalat. Saldon och vem-betalar-vem räknas ut
automatiskt — med Swish-betalning med ett tryck direkt från saldovyn.

🔗 **Live:** [tollysplit.xuper.fun](https://tollysplit.xuper.fun)

🌍 **Språk:** [English](README.md) · Svenska

[![Licens: MIT](https://img.shields.io/badge/License-MIT-0d9488.svg)](LICENSE)
&nbsp;Next.js 16 · Supabase · Tailwind v4

---

## Funktioner

- **Inget konto behövs** för att skapa eller använda en split — den hemliga
  länken *är* nyckeln. Valfri e-postinloggning gör bara att dina splits följer
  med mellan enheter.
- **Flexibel delning:** lika, viktade andelar eller exakta belopp, med
  öresfördelning enligt största-rest-metoden.
- **Smarta avräkningar:** minsta möjliga antal betalningar ("A betalar B X kr"),
  bokförbara som överföringar.
- **Betalning byggd för Norden** — se nedan.
- **Mörkt / ljust / system-läge**, integritets- & cookiepolicy, cookiefri
  statistik.

## 🇸🇪 Betalning — Swish först

Tollysplit satsar på den **svenska marknaden**: när en split är i SEK och
mottagaren har sparat ett Swish-nummer får varje avräkningsrad en **"Swisha"-
knapp** som visar en förifylld QR-kod (mottagare, exakt belopp och splittens
namn som meddelande) och en **"Öppna Swish"**-länk som startar appen med allt
ifyllt på mobilen. Ett tryck, klart.

Det funkar för att **Swish har ett genuint öppet, avtalsfritt API** — en publik
förifylld deeplink (`app.swish.nu`) och ett publikt QR-endpoint. Inget
företagsavtal, inga API-nycklar. Härligt utvecklarvänligt.

Tyvärr erbjuder **de andra nordiska plånböckerna inte samma sak.** Vipps (Norge)
och MobilePay (Danmark/Finland, numera Vipps MobilePay) har bara
belopps-förifyllda flöden via sina **ePayment/QR-API:er för handlare, vilka
kräver företagsavtal och leder pengarna till ett företag** snarare än
person-till-person. Det enda publika är en personlig QR som bär ett
telefonnummer men inget belopp. Så för Vipps, MobilePay och IBAN gör Tollysplit
det ärliga: sparar betaluppgiften och visar den med en **kopiera-knapp** intill
beloppet, så betalaren kan slutföra i sin egen app. Om Vipps eller MobilePay
någon gång släpper en öppen P2P-deeplink i Swish-stil är det en liten ändring
att koppla in — PR välkomna. 🤞

## Arkitektur

- **Ingen service-role-nyckel i appen.** All dataåtkomst går via
  `security definer`-RPC:er i Postgres (`split_data`, `save_entry`, …) där den
  hemliga split-nyckeln i URL:en är capability. RLS är aktiverat utan policies
  (deny-all) på samtliga tabeller och direkt-grants är återkallade — appen
  håller bara den publika publishable-nyckeln. Hela schemat finns i
  [`supabase/migrations/`](supabase/migrations).
- **Next.js App Router** + server actions; klienten är ren React utan
  state-bibliotek. Tailwind v4.
- **Integritet by design:** betaluppgifter raderas när alla är kvitt, inaktiva
  splits gallras efter 6 månader, och spamskyddets IP-hash raderas inom ett
  dygn.

## Kör lokalt

```bash
npm install
cp .env.example .env.local   # fyll i din egen Supabase-URL + anon-nyckel
npm run dev
```

## Deploya din egen

Tollysplit är byggd för att gå att självhosta på gratisnivåerna hos
Supabase + Vercel. Fullständig steg-för-steg-guide finns i den
[engelska README:n](README.md#deploy-your-own) (Supabase → Vercel →
Cloudflare).

## Licens

MIT — se [LICENSE](LICENSE).

---

<div align="center">

Om Tollysplit besparade ditt gäng lite tjafs kan du

[![Bjud på en öl](https://img.shields.io/badge/Bjud%20p%C3%A5%20en%20%C3%B6l-%F0%9F%8D%BA-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/xuperfun)

*byggd med kärlek, kaffe och öl*

</div>

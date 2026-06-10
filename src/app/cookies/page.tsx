import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookiepolicy — Tollysplit",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link
        href="/"
        className="mb-10 inline-block text-xl font-black tracking-tight text-primary"
      >
        tollysplit
      </Link>
      <h1 className="mb-2 text-3xl font-black tracking-tight">Cookiepolicy</h1>
      <p className="mb-8 text-stone-500">
        Korta versionen: Tollysplit använder bara cookies som krävs för att
        sajten ska fungera. Ingen spårning, ingen reklam, inga
        tredjepartscookies — och därför behövs inget cookiesamtycke.
      </p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-stone-200/80 bg-surface p-5 shadow-sm">
          <h2 className="mb-1.5 font-bold">Nödvändiga cookies</h2>
          <p className="text-sm leading-relaxed text-stone-500">
            Om du väljer att logga in sätts en sessionscookie (
            <code className="rounded bg-stone-100 px-1">sb-…-auth-token</code>)
            som håller dig inloggad. Den sätts av vår databastjänst Supabase,
            innehåller bara din inloggningssession och försvinner när du
            loggar ut. Loggar du aldrig in sätts ingen cookie alls.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200/80 bg-surface p-5 shadow-sm">
          <h2 className="mb-1.5 font-bold">Lokal lagring (localStorage)</h2>
          <p className="text-sm leading-relaxed text-stone-500">
            Din webbläsare sparar några saker lokalt som aldrig skickas till
            oss: listan ”Dina tollysplits”, ditt ”vem är du”-val per split,
            ditt val av ljust/mörkt läge och att du stängt cookie-notisen.
            Allt ligger kvar på din enhet och kan rensas via webbläsarens
            inställningar.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200/80 bg-surface p-5 shadow-sm">
          <h2 className="mb-1.5 font-bold">Det som inte finns</h2>
          <p className="text-sm leading-relaxed text-stone-500">
            Inga analyscookies, inga annonsnätverk, ingen
            tredjepartsspårning, inga ”vi och våra 847 partners”. Vi räknar
            sidvisningar med Vercels webbstatistik, men den är helt
            cookiefri och anonym — den kan inte känna igen dig mellan besök
            eller följa dig till andra sajter. Eftersom allt vi använder är
            strikt nödvändigt eller cookiefritt kräver lagen inget samtycke
            — notisen du såg är bara information.
          </p>
        </section>
      </div>

      <p className="mt-8 text-center text-sm text-stone-400">
        Se även{" "}
        <Link
          href="/integritet"
          className="text-primary hover:text-primary-dark"
        >
          integritetspolicyn
        </Link>
        . Senast uppdaterad 2026-06-10.
      </p>
    </main>
  );
}

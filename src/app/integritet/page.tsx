import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integritetspolicy — Tollysplit",
};

const SECTIONS: [string, React.ReactNode][] = [
  [
    "Vilka uppgifter sparas?",
    <>
      Bara det du själv lägger in: splittens namn, deltagarnas namn (förnamn
      räcker gott), utgifter och överföringar. Frivilligt kan deltagare lägga
      till sitt Swish-nummer (används enbart för att visa betalningslänkar och
      QR-koder) och du kan logga in med din e-postadress (helt valfritt — det
      enda inloggningen ger är att dina splits följer med mellan enheter). Vid
      skapande sparas dessutom en hashad version av din IP-adress som
      spamskydd.
    </>,
  ],
  [
    "Hur länge?",
    <>
      <strong>Swish-nummer</strong> raderas automatiskt så fort alla i
      splitten är kvitt — de behövs inte längre då.{" "}
      <strong>Hela splits</strong> raderas automatiskt efter 6 månader utan
      aktivitet (att öppna splitten räknas som aktivitet). Skapar du splits
      inloggad kan du stänga av den gallringen per split under Inställningar.{" "}
      <strong>IP-hashen</strong> raderas inom 24 timmar.
    </>,
  ],
  [
    "Vem kan se din data?",
    <>
      Alla som har den hemliga länken till en split kan se och ändra dess
      innehåll — det är så Tollysplit fungerar, precis som ett delat
      anteckningsblock. Dela länken bara med dem som ska vara med. Ingen
      data säljs, delas eller används för reklam. Ingen spårning, inga
      analysverktyg, inga tredjepartscookies.
    </>,
  ],
  [
    "Underleverantörer",
    <>
      Tollysplit driftas på Vercel (hosting) och Supabase (databas i
      Stockholm, EU). Inloggningsmejl skickas via Resend. När en Swish-QR
      visas skickas mottagarens nummer, belopp och splittens namn till Swish
      officiella QR-tjänst för att rita koden — inget mer.
    </>,
  ],
  [
    "Cookies & lokal lagring",
    <>
      Loggar du in sätts en sessionscookie — det är allt. Listan ”Dina
      tollysplits” och ditt ”vem är du”-val sparas lokalt i din webbläsare
      (localStorage) och lämnar aldrig din enhet. Detaljer finns i{" "}
      <Link href="/cookies" className="text-primary hover:text-primary-dark">
        cookiepolicyn
      </Link>
      .
    </>,
  ],
  [
    "Dina rättigheter",
    <>
      Vill du att en split, ett namn eller en e-postadress raderas direkt
      istället för att vänta på gallringen? Mejla{" "}
      <a
        href="mailto:tollysplit@xuper.fun"
        className="text-primary hover:text-primary-dark"
      >
        tollysplit@xuper.fun
      </a>{" "}
      så fixar vi det.
    </>,
  ],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link
        href="/"
        className="mb-10 inline-block text-xl font-black tracking-tight text-primary"
      >
        tollysplit
      </Link>
      <h1 className="mb-2 text-3xl font-black tracking-tight">
        Integritetspolicy
      </h1>
      <p className="mb-8 text-stone-500">
        Tollysplit är byggt för att veta så lite som möjligt om dig.
        Grundprincipen: vi sparar bara det som behövs för att dela utgifter,
        och raderar det när det inte behövs längre.
      </p>
      <div className="space-y-6">
        {SECTIONS.map(([title, body]) => (
          <section
            key={title}
            className="rounded-2xl border border-stone-200/80 bg-surface p-5 shadow-sm"
          >
            <h2 className="mb-1.5 font-bold">{title}</h2>
            <p className="text-sm leading-relaxed text-stone-500">{body}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-stone-400">
        Senast uppdaterad 2026-06-10
      </p>
    </main>
  );
}

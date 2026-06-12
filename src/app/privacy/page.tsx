import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy — Tollysplit",
  // Keep the policy out of search results — data subjects reach it via the
  // footer link; it shouldn't surface the controller's name in searches.
  robots: { index: false, follow: false },
};

const SECTIONS: [string, React.ReactNode][] = [
  [
    "Who is responsible (data controller)",
    <>
      Tollysplit is run by a private individual in Sweden as a non-commercial
      hobby project (the “buy me a beer” link doesn't cover its running costs).
      The data controller is{" "}
      <a
        href="https://www.linkedin.com/in/johantollstorp/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-dark"
      >
        Johan (LinkedIn)
      </a>
      , reachable there or at{" "}
      <a
        href="mailto:tollysplit@xuper.fun"
        className="text-primary hover:text-primary-dark"
      >
        tollysplit@xuper.fun
      </a>
      .
    </>,
  ],
  [
    "What data is stored & why (lawful basis)",
    <>
      Only what you enter yourself: the split's name, participant names (first
      names are plenty), expenses and transfers. Optionally, participants can
      add a payment method (Swish/Vipps/MobilePay number or IBAN, used only to
      show payment links and QR codes) and you can sign in with your email
      (entirely optional — it just makes your splits follow you across devices).
      When a split is created we also store a hashed version of your IP address
      as spam protection. The lawful basis is our legitimate interest (Art.
      6(1)(f) GDPR) in providing a simple expense-splitting tool; for sign-in,
      the email is processed to perform that service at your request.
    </>,
  ],
  [
    "For how long?",
    <>
      <strong>Payment details</strong> are wiped automatically as soon as
      everyone in the split is square. <strong>Whole splits</strong> are deleted
      automatically after 6 months of inactivity (opening a split counts as
      activity); signed-in creators can turn that purge off per split.{" "}
      <strong>The IP hash</strong> is deleted within 24 hours.
    </>,
  ],
  [
    "Who can see your data?",
    <>
      Anyone with the secret link to a split can view and edit its contents —
      that's how Tollysplit works, just like a shared notepad. Only share the
      link with the people who should be in on it. No data is sold, shared or
      used for advertising, and there is no automated decision-making or
      profiling.
    </>,
  ],
  [
    "Subprocessors & international transfers",
    <>
      Tollysplit runs on Supabase (database in Stockholm, EU), Vercel (hosting
      and anonymous, cookieless visitor statistics) and Resend (sign-in emails).
      When a Swish QR code is shown, the recipient's number, amount and the
      split's name are sent to Swish's official QR service to draw the code.
      Vercel and Resend are US-based; transfers to them rely on their EU–US Data
      Privacy Framework certification and standard contractual clauses. Data
      processing agreements (GDPR Art. 28) are in place with all three.
    </>,
  ],
  [
    "Cookies & local storage",
    <>
      If you sign in, a session cookie is set — that's all. The “Your
      tollysplits” list, your “who are you” choice and your language/theme
      preferences are stored locally in your browser and never leave your
      device. Details are in the{" "}
      <Link href="/cookies" className="text-primary hover:text-primary-dark">
        cookie policy
      </Link>
      .
    </>,
  ],
  [
    "Your rights",
    <>
      Much of this is self-service: anyone with the link can edit or delete
      entries, export the whole split as JSON or CSV from Settings, and remove
      a participant — so you can take yourself out of a split directly, as long
      as you haven't recorded any expenses or transfers yet. Beyond that, you
      have the right to access, rectification, erasure, restriction, objection
      and data portability regarding your personal data. Email{" "}
      <a
        href="mailto:tollysplit@xuper.fun"
        className="text-primary hover:text-primary-dark"
      >
        tollysplit@xuper.fun
      </a>{" "}
      and we'll take care of it — including deleting a split, name or email
      right away instead of waiting for the automatic purge. You also have the
      right to lodge a complaint with the Swedish supervisory authority,{" "}
      <a
        href="https://www.imy.se/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-dark"
      >
        IMY
      </a>
      .
    </>,
  ],
  [
    "Children",
    <>
      Tollysplit isn't directed at children and we don't knowingly collect data
      from anyone under 13. If a child has been added to a split, contact us and
      we'll remove the data.
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
      <h1 className="mb-2 text-3xl font-black tracking-tight">Privacy policy</h1>
      <p className="mb-8 text-stone-500">
        Tollysplit is built to know as little about you as possible. The core
        principle: we only store what's needed to split expenses, and delete it
        when it's no longer needed.
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
        Last updated 2026-06-12
      </p>
    </main>
  );
}

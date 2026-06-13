import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SplitSummary } from "@/lib/types";
import { BeerButton } from "@/components/BeerButton";
import { MySplits } from "@/components/MySplits";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getI18n } from "@/lib/i18n/server";

export default async function Home() {
  const { dict, t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let mine: SplitSummary[] = [];
  if (user) {
    const { data } = await supabase.rpc("my_splits");
    mine = (data as SplitSummary[] | null) ?? [];
  }

  const steps = [
    [dict.landing.step1Title, dict.landing.step1Body],
    [dict.landing.step2Title, dict.landing.step2Body],
    [dict.landing.step3Title, dict.landing.step3Body],
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-10 flex items-center justify-between gap-3">
        <span className="text-xl font-black tracking-tight text-primary">
          tollysplit
        </span>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <form action="/auth/signout" method="post" className="flex items-center gap-3">
              <span className="hidden text-sm text-stone-400 sm:inline">
                {t(dict.nav.signedInAs, { email: user.email ?? "" })}
              </span>
              <button className="text-sm font-medium text-stone-500 hover:text-ink">
                {dict.nav.logout}
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-stone-500 hover:text-ink"
            >
              {dict.nav.login}
            </Link>
          )}
        </div>
      </header>

      <section className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">
          {dict.landing.hero1}
          <br />
          <span className="text-primary">{dict.landing.hero2}</span>
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-stone-500">
          {dict.landing.subtitle}
        </p>
        <Link
          href="/new"
          className="inline-block rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          {dict.landing.create}
        </Link>
        <p className="mt-3 text-sm text-stone-400">{dict.landing.noLogin}</p>
      </section>

      <MySplits server={mine} />

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map(([title, body]) => (
          <div
            key={title}
            className="rounded-2xl border border-stone-200/80 bg-surface p-5 shadow-sm"
          >
            <h3 className="mb-1 font-bold">{title}</h3>
            <p className="text-sm text-stone-500">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 flex flex-col items-center gap-4 text-center text-xs text-stone-400">
        <BeerButton />
        <span>
          {dict.footer.tagline} ·{" "}
          <Link href="/privacy" className="hover:text-ink">
            {dict.footer.privacy}
          </Link>{" "}
          ·{" "}
          <Link href="/cookies" className="hover:text-ink">
            {dict.footer.cookies}
          </Link>
        </span>
        <a
          href="https://github.com/kanylbullen/tollysplit"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          {dict.footer.openSource}
        </a>
      </footer>
    </main>
  );
}

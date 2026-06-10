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
          <Link href="/integritet" className="hover:text-ink">
            {dict.footer.privacy}
          </Link>{" "}
          ·{" "}
          <Link href="/cookies" className="hover:text-ink">
            {dict.footer.cookies}
          </Link>
        </span>
      </footer>
    </main>
  );
}

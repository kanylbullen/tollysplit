import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { KittySummary } from "@/lib/types";
import { BeerButton } from "@/components/BeerButton";
import { MySplits } from "@/components/MySplits";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let mine: KittySummary[] = [];
  if (user) {
    const { data } = await supabase.rpc("my_kitties");
    mine = (data as KittySummary[] | null) ?? [];
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight text-primary">
          tollysplit
        </span>
        {user ? (
          <form action="/auth/signout" method="post" className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-400 sm:inline">
              Inloggad som {user.email}
            </span>
            <button className="text-sm font-medium text-stone-500 hover:text-ink">
              Logga ut
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-stone-500 hover:text-ink"
          >
            Logga in
          </Link>
        )}
      </header>

      <section className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">
          Dela utgifter.
          <br />
          <span className="text-primary">Slipp tjafset.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-stone-500">
          Samla resans alla utlägg på ett ställe och se direkt vem som ska få
          tillbaka vad. Inga konton — bara en länk.
        </p>
        <Link
          href="/new"
          className="inline-block rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          Skapa en ny tollysplit
        </Link>
        <p className="mt-3 text-sm text-stone-400">
          Ingen inloggning behövs.
        </p>
      </section>

      <MySplits server={mine} />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Skapa", "Döp din tollysplit och lägg till vilka som är med."],
          ["2. Dela länken", "Alla med länken kan lägga in utgifter — utan konto."],
          ["3. Gör upp", "Saldon räknas ut automatiskt, med färdiga förslag på vem som swishar vem."],
        ].map(([title, body]) => (
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
          tollysplit · byggd med kärlek, kaffe och öl ·{" "}
          <Link href="/integritet" className="hover:text-ink">
            integritetspolicy
          </Link>{" "}
          ·{" "}
          <Link href="/cookies" className="hover:text-ink">
            cookies
          </Link>
        </span>
      </footer>
    </main>
  );
}

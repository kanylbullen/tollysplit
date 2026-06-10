import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { KittySummary } from "@/lib/types";
import { BeerButton } from "@/components/BeerButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canCreate = false;
  let mine: KittySummary[] = [];
  if (user) {
    const [canRes, mineRes] = await Promise.all([
      supabase.rpc("can_create"),
      supabase.rpc("my_kitties"),
    ]);
    canCreate = canRes.data === true;
    mine = (mineRes.data as KittySummary[] | null) ?? [];
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
          tillbaka vad. Inga konton för deltagarna — bara en länk.
        </p>
        {canCreate ? (
          <Link
            href="/new"
            className="inline-block rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
          >
            Skapa en ny tollysplit
          </Link>
        ) : user ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Ditt konto ({user.email}) har inte behörighet att skapa nya
            tollysplits ännu.
          </p>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
          >
            Logga in för att skapa
          </Link>
        )}
      </section>

      {mine.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-400">
            Dina tollysplits
          </h2>
          <ul className="space-y-2">
            {mine.map((k) => (
              <li key={k.key}>
                <Link
                  href={`/k/${k.key}`}
                  className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-surface px-4 py-3.5 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="font-semibold">{k.title}</div>
                    <div className="text-sm text-stone-400">
                      {k.participant_count} deltagare · {k.entry_count}{" "}
                      {k.entry_count === 1 ? "post" : "poster"}
                    </div>
                  </div>
                  <span className="text-stone-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <span>tollysplit · byggd med kärlek, kaffe och öl</span>
      </footer>
    </main>
  );
}

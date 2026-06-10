"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { KittySummary } from "@/lib/types";

type VisitedSplit = { key: string; title: string; at: number };

export function MySplits({ server }: { server: KittySummary[] }) {
  const [visited, setVisited] = useState<VisitedSplit[]>([]);

  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("tollysplit:visited") ?? "[]"
      ) as VisitedSplit[];
      setVisited(raw.filter((v) => v.key && v.title));
    } catch {
      // corrupt localStorage — start over
    }
  }, []);

  const serverKeys = new Set(server.map((k) => k.key));
  const localOnly = visited.filter((v) => !serverKeys.has(v.key));

  if (server.length === 0 && localOnly.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-400">
        Dina tollysplits
      </h2>
      <ul className="space-y-2">
        {server.map((k) => (
          <li key={k.key}>
            <Link
              href={`/k/${k.key}`}
              className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-surface px-4 py-3.5 shadow-sm transition-colors hover:border-primary/40"
            >
              <div>
                <div className="font-semibold">{k.title}</div>
                <div className="text-sm text-stone-400">
                  {k.participant_count} deltagare · {k.entry_count}{" "}
                  {k.entry_count === 1 ? "post" : "poster"} · skapad{" "}
                  {new Date(k.created_at).toLocaleDateString("sv-SE")}
                </div>
              </div>
              <span className="text-stone-300">→</span>
            </Link>
          </li>
        ))}
        {localOnly.map((v) => (
          <li key={v.key}>
            <Link
              href={`/k/${v.key}`}
              className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-surface px-4 py-3.5 shadow-sm transition-colors hover:border-primary/40"
            >
              <div>
                <div className="font-semibold">{v.title}</div>
                <div className="text-sm text-stone-400">
                  senast öppnad {new Date(v.at).toLocaleDateString("sv-SE")}
                </div>
              </div>
              <span className="text-stone-300">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-xs text-stone-400">
        Listan sparas i din webbläsare.{" "}
        <Link href="/login" className="text-primary hover:text-primary-dark">
          Logga in
        </Link>{" "}
        om du vill att den följer med mellan enheter.
      </p>
    </section>
  );
}

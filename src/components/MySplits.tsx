"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SplitSummary } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_INTL } from "@/lib/i18n/config";

type VisitedSplit = { key: string; title: string; at: number };

export function MySplits({ server }: { server: SplitSummary[] }) {
  const { dict, t, locale } = useI18n();
  const intl = LOCALE_INTL[locale];
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
        {dict.mySplits.title}
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
                  {t(dict.mySplits.participants, { count: k.participant_count })}{" "}
                  ·{" "}
                  {t(
                    k.entry_count === 1
                      ? dict.mySplits.entriesOne
                      : dict.mySplits.entriesMany,
                    { count: k.entry_count }
                  )}{" "}
                  ·{" "}
                  {t(dict.mySplits.created, {
                    date: new Date(k.created_at).toLocaleDateString(intl),
                  })}
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
                  {t(dict.mySplits.lastOpened, {
                    date: new Date(v.at).toLocaleDateString(intl),
                  })}
                </div>
              </div>
              <span className="text-stone-300">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-xs text-stone-400">
        {dict.mySplits.savedHint1}{" "}
        <Link href="/login" className="text-primary hover:text-primary-dark">
          {dict.mySplits.loginCta}
        </Link>{" "}
        {dict.mySplits.savedHint2}
      </p>
    </section>
  );
}

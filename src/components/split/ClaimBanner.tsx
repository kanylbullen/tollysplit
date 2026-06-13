"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Participant } from "@/lib/types";
import { claimParticipantAction } from "@/app/k/[key]/actions";
import { useI18n } from "@/lib/i18n/client";

// Secure splits: you become a participant by claiming a slot (bound to your
// account). Shown until the viewer has claimed one.
export function ClaimBanner({
  splitKey,
  participants,
  loggedIn,
}: {
  splitKey: string;
  participants: Participant[];
  loggedIn: boolean;
}) {
  const { dict, te } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const claimable = participants.filter((p) => !p.claimed);

  function claim(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await claimParticipantAction(splitKey, id);
      if (!result.ok) setError(te(result.error));
    });
  }

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
      <p className="text-sm font-semibold">{dict.claim.title}</p>
      {!loggedIn ? (
        <>
          <p className="mt-1 text-sm text-stone-500">{dict.claim.loginFirst}</p>
          <Link
            href={`/login?next=/k/${splitKey}`}
            className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {dict.nav.login}
          </Link>
        </>
      ) : claimable.length === 0 ? (
        <p className="mt-1 text-sm text-stone-500">{dict.claim.noneLeft}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-500">{dict.claim.pickName}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {claimable.map((p) => (
              <button
                key={p.id}
                onClick={() => claim(p.id)}
                disabled={pending}
                className="rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary-dark disabled:opacity-50"
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}
    </div>
  );
}

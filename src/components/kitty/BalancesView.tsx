"use client";

import { useState, useTransition } from "react";
import type { Entry, Participant } from "@/lib/types";
import { balances, formatMoney, settlements, totalSpent } from "@/lib/money";
import { saveEntryAction } from "@/app/k/[key]/actions";
import { avatarColor, initials, todayIso } from "./helpers";

export function BalancesView({
  kittyKey,
  entries,
  participants,
  currency,
  meId,
}: {
  kittyKey: string;
  entries: Entry[];
  participants: Participant[];
  currency: string;
  meId: string | null;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const bal = balances(participants, entries);
  const plan = settlements(bal);
  const total = totalSpent(entries);
  const maxAbs = Math.max(1, ...[...bal.values()].map(Math.abs));

  const [pending, startTransition] = useTransition();
  const [settling, setSettling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function recordSettlement(from: string, to: string, amount: number) {
    const id = `${from}-${to}`;
    setSettling(id);
    setError(null);
    startTransition(async () => {
      const result = await saveEntryAction(kittyKey, {
        kind: "transfer",
        description: "Avräkning",
        amount_cents: amount,
        paid_by: from,
        transfer_to: to,
        entry_date: todayIso(),
        shares: [],
      });
      if (!result.ok) setError(result.error);
      setSettling(null);
    });
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-stone-400">Totalt spenderat</p>
        <p className="text-3xl font-black tracking-tight">
          {formatMoney(total, currency)}
        </p>
      </div>

      <section>
        <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-400">
          Saldo per person
        </h3>
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          {participants.map((p, i) => {
            const value = bal.get(p.id) ?? 0;
            const width = Math.round((Math.abs(value) / maxAbs) * 100);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-stone-100" : ""}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(p)}`}
                >
                  {initials(p.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {p.name}
                    {meId === p.id && (
                      <span className="ml-1.5 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-bold text-primary-dark">
                        du
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <span
                      className={`block h-full rounded-full ${value >= 0 ? "bg-positive" : "bg-negative"}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                </span>
                <span
                  className={`font-bold ${value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-stone-400"}`}
                >
                  {value > 0 ? "+" : ""}
                  {formatMoney(value, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-400">
          Så blir ni kvitt
        </h3>
        {plan.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 text-center shadow-sm">
            <p className="font-semibold">Allt är uppgjort 🎉</p>
            <p className="text-sm text-stone-500">Ingen är skyldig någon något.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            {plan.map((s, i) => {
              const from = byId.get(s.from);
              const to = byId.get(s.to);
              const id = `${s.from}-${s.to}`;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-stone-100" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{from?.name}</span>
                    <span className="text-stone-400"> betalar </span>
                    <span className="font-semibold">{to?.name}</span>
                    <span className="block font-bold text-primary-dark">
                      {formatMoney(s.amount_cents, currency)}
                    </span>
                  </span>
                  <button
                    onClick={() => recordSettlement(s.from, s.to, s.amount_cents)}
                    disabled={pending}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-50"
                  >
                    {settling === id ? "Bokför…" : "Markera betald"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
        <p className="mt-2 px-1 text-xs text-stone-400">
          ”Markera betald” bokför en överföring så att saldona nollas.
        </p>
      </section>
    </div>
  );
}

"use client";

import type { Entry, Participant } from "@/lib/types";
import { expenseSplit, formatMoney } from "@/lib/money";
import { avatarColor, formatDateHeading, initials } from "./helpers";

export function EntriesView({
  entries,
  participants,
  currency,
  meId,
  onEdit,
}: {
  entries: Entry[];
  participants: Participant[];
  currency: string;
  meId: string | null;
  onEdit: (entry: Entry) => void;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mb-3 text-4xl">🧾</div>
        <p className="font-semibold">Inga utgifter ännu</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-stone-500">
          Lägg in den första utgiften med knappen här nedanför, så sköter vi
          räknandet.
        </p>
      </div>
    );
  }

  const groups: { date: string; items: Entry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.entry_date) last.items.push(entry);
    else groups.push({ date: entry.entry_date, items: [entry] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-400">
            {formatDateHeading(group.date)}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-surface shadow-sm">
            {group.items.map((entry, i) => {
              const payer = byId.get(entry.paid_by);
              const isTransfer = entry.kind === "transfer";
              const recipient = entry.transfer_to
                ? byId.get(entry.transfer_to)
                : null;
              const myShare =
                !isTransfer && meId ? (expenseSplit(entry).get(meId) ?? 0) : 0;

              return (
                <button
                  key={entry.id}
                  onClick={() => onEdit(entry)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-50 ${
                    i > 0 ? "border-t border-stone-100" : ""
                  }`}
                >
                  {payer && (
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(payer)}`}
                    >
                      {initials(payer.name)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {isTransfer
                        ? `${payer?.name ?? "?"} → ${recipient?.name ?? "?"}`
                        : entry.description || "Utgift"}
                    </span>
                    <span className="block truncate text-sm text-stone-400">
                      {isTransfer
                        ? entry.description || "Överföring"
                        : `${payer?.name ?? "?"} betalade`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span
                      className={`block font-bold ${isTransfer ? "text-stone-400" : ""}`}
                    >
                      {formatMoney(entry.amount_cents, currency)}
                    </span>
                    {myShare > 0 && (
                      <span className="block text-xs text-stone-400">
                        din del {formatMoney(myShare, currency)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

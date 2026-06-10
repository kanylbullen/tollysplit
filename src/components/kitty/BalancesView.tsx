"use client";

import { useState, useTransition } from "react";
import { track } from "@vercel/analytics";
import type { Entry, Participant } from "@/lib/types";
import {
  balances,
  formatMoney,
  settlements,
  shareOfTotal,
  totalSpent,
} from "@/lib/money";
import { saveEntryAction, setSwishNumberAction } from "@/app/k/[key]/actions";
import { normalizeSwishNumber } from "@/lib/swish";
import { avatarColor, initials, todayIso } from "./helpers";
import { SwishDialog, type SwishPayment } from "./SwishDialog";

export function BalancesView({
  kittyKey,
  kittyTitle,
  entries,
  participants,
  currency,
  meId,
  onEditEntry,
}: {
  kittyKey: string;
  kittyTitle: string;
  entries: Entry[];
  participants: Participant[];
  currency: string;
  meId: string | null;
  onEditEntry: (entry: Entry) => void;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const bal = balances(participants, entries);
  const plan = settlements(bal);
  const total = totalSpent(entries);
  const shares = shareOfTotal(participants, entries);
  const paidTransfers = entries.filter((e) => e.kind === "transfer");
  const maxAbs = Math.max(1, ...[...bal.values()].map(Math.abs));

  const [pending, startTransition] = useTransition();
  const [settling, setSettling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swishPayment, setSwishPayment] = useState<SwishPayment | null>(null);
  const [swishOpen, setSwishOpen] = useState(false);
  const [swishInput, setSwishInput] = useState("");
  const [swishError, setSwishError] = useState<string | null>(null);

  const me = meId ? participants.find((p) => p.id === meId) : null;
  const useSwish = currency === "SEK";
  const showSwishPrompt =
    useSwish && me && !me.swish_number && (bal.get(me.id) ?? 0) > 0;

  function saveMySwishNumber() {
    if (!me) return;
    const normalized = normalizeSwishNumber(swishInput);
    if (!normalized) {
      setSwishError("Ange ett svenskt mobilnummer, t.ex. 070-123 45 67.");
      return;
    }
    setSwishError(null);
    startTransition(async () => {
      const result = await setSwishNumberAction(kittyKey, me.id, normalized);
      if (!result.ok) setSwishError(result.error);
    });
  }

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
      else track("settlement_paid");
      setSettling(null);
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-400">
          Så blir ni kvitt
        </h3>
        {showSwishPrompt && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <p className="mb-2 text-sm font-semibold">
              Du har pengar att få, {me.name}! Lägg in ditt Swish-nummer så
              kan de andra swisha dig direkt härifrån.
            </p>
            <div className="flex gap-2">
              <input
                inputMode="tel"
                placeholder="070-123 45 67"
                value={swishInput}
                onChange={(e) => setSwishInput(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveMySwishNumber}
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Spara
              </button>
            </div>
            {swishError && (
              <p className="mt-1.5 text-xs text-negative">{swishError}</p>
            )}
          </div>
        )}
        {plan.length === 0 && paidTransfers.length === 0 ? (
          <div className="rounded-2xl border border-stone-200/80 bg-surface p-5 text-center shadow-sm">
            <p className="font-semibold">Allt är uppgjort 🎉</p>
            <p className="text-sm text-stone-500">Ingen är skyldig någon något.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-surface shadow-sm">
            {plan.length === 0 && (
              <div className="px-4 py-3.5 text-center">
                <p className="font-semibold">Allt är uppgjort 🎉</p>
              </div>
            )}
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
                  <span className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row">
                    {useSwish && to?.swish_number && (
                      <button
                        onClick={() => {
                          track("swish_dialog_opened");
                          setSwishPayment({
                            fromName: from?.name ?? "?",
                            toName: to.name,
                            toNumber: to.swish_number!,
                            amountCents: s.amount_cents,
                            message: kittyTitle,
                          });
                          setSwishOpen(true);
                        }}
                        className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                      >
                        Swisha
                      </button>
                    )}
                    <button
                      onClick={() => recordSettlement(s.from, s.to, s.amount_cents)}
                      disabled={pending}
                      className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-50"
                    >
                      {settling === id ? "Bokför…" : "Markera betald"}
                    </button>
                  </span>
                </div>
              );
            })}
            {paidTransfers.map((t) => {
              const from = byId.get(t.paid_by);
              const to = t.transfer_to ? byId.get(t.transfer_to) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => onEditEntry(t)}
                  className="flex w-full items-center gap-3 border-t border-stone-100 px-4 py-3 text-left opacity-60 transition-opacity hover:opacity-100"
                >
                  <span className="min-w-0 flex-1 line-through decoration-stone-400">
                    <span className="font-semibold">{from?.name}</span>
                    <span className="text-stone-400"> betalar </span>
                    <span className="font-semibold">{to?.name}</span>
                    <span className="block font-bold text-stone-500">
                      {formatMoney(t.amount_cents, currency)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-positive">
                    Betald ✓
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
        <p className="mt-2 px-1 text-xs text-stone-400">
          ”Markera betald” bokför en överföring så att saldona nollas.
        </p>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-stone-400">
          Saldo per person
        </h3>
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-surface shadow-sm">
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
                <span className="text-right">
                  <span
                    className={`block font-bold ${value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-stone-400"}`}
                  >
                    {value > 0 ? "+" : ""}
                    {formatMoney(value, currency)}
                  </span>
                  <span className="block text-xs text-stone-400">
                    andel {formatMoney(shares.get(p.id) ?? 0, currency)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-stone-200/80 bg-surface p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-stone-400">Totalt spenderat</p>
        <p className="text-3xl font-black tracking-tight">
          {formatMoney(total, currency)}
        </p>
      </div>

      <SwishDialog
        open={swishOpen}
        onClose={() => setSwishOpen(false)}
        payment={swishPayment}
      />
    </div>
  );
}

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
import { saveEntryAction, setPaymentMethodAction } from "@/app/k/[key]/actions";
import {
  PAYMENT_META,
  PAYMENT_TYPES,
  type PaymentType,
  normalizePayment,
} from "@/lib/payment";
import { avatarColor, initials, todayIso } from "./helpers";
import { PaymentDialog, type Payment } from "./PaymentDialog";

// Pick a sensible default payment method from the split's currency.
const DEFAULT_TYPE: Record<string, PaymentType> = {
  SEK: "swish",
  NOK: "vipps",
  DKK: "mobilepay",
};

export function BalancesView({
  splitKey,
  splitTitle,
  entries,
  participants,
  currency,
  meId,
  onEditEntry,
}: {
  splitKey: string;
  splitTitle: string;
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
  const [payment, setPayment] = useState<Payment | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payType, setPayType] = useState<PaymentType>(
    DEFAULT_TYPE[currency] ?? "iban"
  );
  const [payInput, setPayInput] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const me = meId ? participants.find((p) => p.id === meId) : null;
  const showPaymentPrompt = me && !me.payment_value && (bal.get(me.id) ?? 0) > 0;

  function saveMyPayment() {
    if (!me) return;
    const normalized = normalizePayment(payType, payInput);
    if (!normalized) {
      setPayError(
        PAYMENT_META[payType].kind === "iban"
          ? "Ange ett giltigt IBAN."
          : "Ange ett giltigt telefonnummer."
      );
      return;
    }
    setPayError(null);
    startTransition(async () => {
      const result = await setPaymentMethodAction(splitKey, me.id, payType, normalized);
      if (!result.ok) setPayError(result.error);
    });
  }

  function recordSettlement(from: string, to: string, amount: number) {
    const id = `${from}-${to}`;
    setSettling(id);
    setError(null);
    startTransition(async () => {
      const result = await saveEntryAction(splitKey, {
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
        {showPaymentPrompt && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <p className="mb-2 text-sm font-semibold">
              Du har pengar att få, {me.name}! Lägg in ditt betalsätt så kan de
              andra betala dig direkt härifrån.
            </p>
            <div className="flex gap-2">
              <select
                value={payType}
                onChange={(e) => setPayType(e.target.value as PaymentType)}
                className="rounded-xl border border-stone-300 bg-surface px-2 py-2 text-sm outline-none focus:border-primary"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PAYMENT_META[t].label}
                  </option>
                ))}
              </select>
              <input
                inputMode={PAYMENT_META[payType].kind === "iban" ? "text" : "tel"}
                placeholder={PAYMENT_META[payType].placeholder}
                value={payInput}
                onChange={(e) => setPayInput(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveMyPayment}
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Spara
              </button>
            </div>
            {payError && <p className="mt-1.5 text-xs text-negative">{payError}</p>}
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
              const canPay = to?.payment_type && to?.payment_value;
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
                    {canPay && (
                      <button
                        onClick={() => {
                          track("payment_dialog_opened", { method: to!.payment_type! });
                          setPayment({
                            fromName: from?.name ?? "?",
                            toName: to!.name,
                            toType: to!.payment_type!,
                            toValue: to!.payment_value!,
                            amountCents: s.amount_cents,
                            currency,
                            message: splitTitle,
                          });
                          setPayOpen(true);
                        }}
                        className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                      >
                        {to!.payment_type === "swish" ? "Swisha" : "Betala"}
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

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        payment={payment}
      />
    </div>
  );
}

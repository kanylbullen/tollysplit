"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { formatMoney, parseAmount } from "@/lib/money";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_INTL } from "@/lib/i18n/config";

export type Settlement = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fullCents: number;
};

export function SettleDialog({
  open,
  onClose,
  settlement,
  currency,
  pending,
  warnEarly = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  currency: string;
  pending: boolean;
  /** True when not everyone has seen the split yet. */
  warnEarly?: boolean;
  onConfirm: (cents: number) => void;
}) {
  const { dict, t, locale } = useI18n();
  const intl = LOCALE_INTL[locale];
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Prefill with the full suggested amount whenever a new settlement opens.
  useEffect(() => {
    if (open && settlement) {
      setText((settlement.fullCents / 100).toFixed(2).replace(".", ","));
      setError(null);
    }
  }, [open, settlement]);

  if (!settlement) return null;

  const full = settlement.fullCents;
  const isFull = parseAmount(text) === full;

  function submit() {
    const cents = parseAmount(text);
    if (cents === null || cents <= 0) {
      setError(dict.settle.errAmount);
      return;
    }
    if (cents > full) {
      setError(t(dict.settle.errTooMuch, { max: formatMoney(full, currency, intl) }));
      return;
    }
    onConfirm(cents);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(dict.settle.title, { from: settlement.fromName, to: settlement.toName })}
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-500">
          {t(dict.settle.owes, {
            from: settlement.fromName,
            to: settlement.toName,
            amount: formatMoney(full, currency, intl),
          })}
        </p>

        {warnEarly && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
            ⏳ {dict.pay.earlyWarning}
          </p>
        )}

        <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => {
              setText((full / 100).toFixed(2).replace(".", ","));
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isFull ? "bg-surface text-ink shadow-sm" : "text-stone-500 hover:text-ink"
            }`}
          >
            {dict.settle.whole}
          </button>
          <button
            type="button"
            onClick={() => {
              setText("");
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              !isFull ? "bg-surface text-ink shadow-sm" : "text-stone-500 hover:text-ink"
            }`}
          >
            {dict.settle.part}
          </button>
        </div>

        <div>
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            autoFocus
            className="w-full rounded-xl border border-stone-300 bg-surface px-3 py-2.5 text-lg font-semibold outline-none focus:border-primary"
          />
          {error && <p className="mt-1.5 text-sm text-negative">{error}</p>}
        </div>

        <Button onClick={submit} disabled={pending} className="w-full">
          {dict.settle.confirm}
        </Button>
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { Dialog } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_META,
  type PaymentType,
  formatPayment,
  hasRichLink,
  swishAppLink,
} from "@/lib/payment";

export type Payment = {
  fromName: string;
  toName: string;
  toType: PaymentType;
  toValue: string;
  amountCents: number;
  currency: string;
  message: string;
};

export function PaymentDialog({
  open,
  onClose,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}) {
  const [copied, setCopied] = useState(false);
  if (!payment) return null;

  const rich = hasRichLink(payment.toType);
  const pretty = formatPayment(payment.toType, payment.toValue);
  const label = PAYMENT_META[payment.toType].label;
  const qrSrc = `/api/swish-qr?number=${payment.toValue}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  async function copy() {
    await navigator.clipboard.writeText(payment!.toValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Betala ${payment.toName}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-stone-500">
          <span className="font-semibold text-ink">{payment.fromName}</span>{" "}
          betalar{" "}
          <span className="font-semibold text-ink">{payment.toName}</span> via{" "}
          {label}
        </p>
        <p className="text-3xl font-black tracking-tight">
          {formatMoney(payment.amountCents, payment.currency)}
        </p>

        {rich && open && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrSrc}
            alt={`Swish-QR till ${payment.toName}`}
            width={220}
            height={220}
            className="rounded-xl border border-stone-200 bg-white p-2"
          />
        )}

        <button
          onClick={copy}
          className="w-full rounded-xl border border-stone-300 bg-surface px-4 py-3 font-mono text-sm font-semibold transition-colors hover:border-primary"
        >
          {copied ? "Kopierat ✓" : `${pretty}  ·  kopiera`}
        </button>

        {rich ? (
          <>
            <p className="text-sm text-stone-500">
              Scanna QR-koden med Swish-appen, eller öppna Swish direkt på den
              här enheten:
            </p>
            <a
              href={swishAppLink(payment.toValue, payment.amountCents, payment.message)}
              onClick={() => track("swish_app_opened")}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
            >
              Öppna Swish-appen
            </a>
          </>
        ) : (
          <p className="text-sm text-stone-500">
            Öppna {label} i din telefon och betala{" "}
            {formatMoney(payment.amountCents, payment.currency)} till uppgiften ovan.
          </p>
        )}

        <p className="text-xs text-stone-400">
          Glöm inte att trycka ”Markera betald” när betalningen är gjord — vi
          får ingen bekräftelse automatiskt.
        </p>
      </div>
    </Dialog>
  );
}

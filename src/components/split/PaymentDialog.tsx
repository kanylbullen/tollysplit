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
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_INTL } from "@/lib/i18n/config";

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
  const { dict, t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!payment) return null;

  const rich = hasRichLink(payment.toType);
  const pretty = formatPayment(payment.toType, payment.toValue);
  const label = PAYMENT_META[payment.toType].label;
  const amount = formatMoney(payment.amountCents, payment.currency, LOCALE_INTL[locale]);
  const qrSrc = `/api/swish-qr?number=${payment.toValue}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  async function copy() {
    await navigator.clipboard.writeText(payment!.toValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t(dict.pay.title, { name: payment.toName })}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-stone-500">
          {t(dict.pay.via, {
            from: payment.fromName,
            to: payment.toName,
            method: label,
          })}
        </p>
        <p className="text-3xl font-black tracking-tight">{amount}</p>

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
          {copied ? dict.pay.copied : `${pretty}  ·  ${dict.pay.copy}`}
        </button>

        {rich ? (
          <>
            <p className="text-sm text-stone-500">{dict.pay.swishScan}</p>
            <a
              href={swishAppLink(payment.toValue, payment.amountCents, payment.message)}
              onClick={() => track("swish_app_opened")}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
            >
              {dict.pay.openSwish}
            </a>
          </>
        ) : (
          <p className="text-sm text-stone-500">
            {t(dict.pay.openOther, { method: label, amount })}
          </p>
        )}

        <p className="text-xs text-stone-400">{dict.pay.reminder}</p>
      </div>
    </Dialog>
  );
}

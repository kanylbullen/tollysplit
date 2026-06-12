"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { Dialog } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_META,
  type PaymentType,
  formatPayment,
  hasAppLink,
  hasRichLink,
  revolutLink,
  swishAppLink,
} from "@/lib/payment";
import type { PaymentMethod } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_INTL } from "@/lib/i18n/config";

export type Payment = {
  fromName: string;
  toName: string;
  methods: PaymentMethod[];
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
  const [selected, setSelected] = useState(0);

  // Reset the chosen method whenever a new payment is opened.
  useEffect(() => {
    if (open) setSelected(0);
  }, [open, payment]);

  if (!payment || payment.methods.length === 0) return null;

  const method = payment.methods[Math.min(selected, payment.methods.length - 1)];
  const type: PaymentType = method.type;
  const rich = hasRichLink(type);
  const appLink = hasAppLink(type);
  const pretty = formatPayment(type, method.value);
  const label = PAYMENT_META[type].label;
  const amount = formatMoney(payment.amountCents, payment.currency, LOCALE_INTL[locale]);
  const qrSrc = `/api/swish-qr?number=${method.value}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  async function copy() {
    await navigator.clipboard.writeText(method.value);
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

        {payment.methods.length > 1 && (
          <div className="flex w-full flex-wrap justify-center gap-1.5">
            {payment.methods.map((m, i) => (
              <button
                key={`${m.type}-${i}`}
                onClick={() => {
                  setSelected(i);
                  setCopied(false);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  i === selected
                    ? "bg-primary text-white"
                    : "border border-stone-300 text-stone-600 hover:border-primary"
                }`}
              >
                {PAYMENT_META[m.type].label}
              </button>
            ))}
          </div>
        )}

        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-left text-xs text-amber-800">
          ⚠️ {dict.pay.verifyWarning}
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
          {copied ? dict.pay.copied : `${pretty}  ·  ${dict.pay.copy}`}
        </button>

        {rich ? (
          <>
            <p className="text-sm text-stone-500">{dict.pay.swishScan}</p>
            <a
              href={swishAppLink(method.value, payment.amountCents, payment.message)}
              onClick={() => track("swish_app_opened")}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
            >
              {dict.pay.openSwish}
            </a>
          </>
        ) : appLink ? (
          <>
            <p className="text-sm text-stone-500">{dict.pay.revolutOpen}</p>
            <a
              href={revolutLink(method.value)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("revolut_app_opened")}
              className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
            >
              {dict.pay.openRevolut}
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

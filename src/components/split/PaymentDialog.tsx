"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { renderSVG } from "uqr";
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

type LnState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; sats: number; pr: string }
  | { status: "error" };

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
  const [ln, setLn] = useState<LnState>({ status: "idle" });

  // Reset the chosen method whenever a new payment is opened.
  useEffect(() => {
    if (open) setSelected(0);
  }, [open, payment]);

  const method =
    payment && payment.methods.length > 0
      ? payment.methods[Math.min(selected, payment.methods.length - 1)]
      : null;

  // Lightning: exchange the address for a BOLT11 invoice on the exact amount.
  // Sats amount is computed from the split currency at the current rate;
  // the invoice itself bakes the amount, so what you scan is what you pay.
  useEffect(() => {
    if (!open || !payment || method?.type !== "lightning") {
      setLn({ status: "idle" });
      return;
    }
    let cancelled = false;
    setLn({ status: "loading" });
    (async () => {
      try {
        const fx = await fetch(
          `/api/fx?from=SATS&to=${payment.currency}`
        ).then((r) => r.json());
        if (typeof fx.rate !== "number" || fx.rate <= 0) throw new Error();
        const sats = Math.max(
          1,
          Math.round(payment.amountCents / 100 / fx.rate)
        );
        const inv = await fetch(
          `/api/ln-invoice?address=${encodeURIComponent(method.value)}&msat=${sats * 1000}`
        ).then((r) => r.json());
        if (typeof inv.pr !== "string") throw new Error();
        if (!cancelled) setLn({ status: "ready", sats, pr: inv.pr });
      } catch {
        if (!cancelled) setLn({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment, method?.type, method?.value]);

  if (!payment || !method) return null;

  const type: PaymentType = method.type;
  const rich = hasRichLink(type);
  const appLink = hasAppLink(type);
  const isLightning = type === "lightning";
  const pretty = formatPayment(type, method.value);
  const label = PAYMENT_META[type].label;
  const amount = formatMoney(payment.amountCents, payment.currency, LOCALE_INTL[locale]);
  const qrSrc = `/api/swish-qr?number=${method.value}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  async function copy() {
    if (!method) return;
    const text =
      isLightning && ln.status === "ready" ? ln.pr : method.value;
    await navigator.clipboard.writeText(text);
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
        <div>
          <p className="text-3xl font-black tracking-tight">{amount}</p>
          {isLightning && ln.status === "ready" && payment.currency !== "SATS" && (
            <p className="text-sm font-semibold text-stone-500">
              ≈ {new Intl.NumberFormat(LOCALE_INTL[locale]).format(ln.sats)} sats
            </p>
          )}
        </div>

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
          {isLightning && ` ${dict.pay.lnIrreversible}`}
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

        {isLightning && ln.status === "ready" && (
          <div
            className="h-[220px] w-[220px] rounded-xl border border-stone-200 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
            aria-label={`Lightning-QR till ${payment.toName}`}
            dangerouslySetInnerHTML={{
              __html: renderSVG(`lightning:${ln.pr.toUpperCase()}`, {
                ecc: "M",
                border: 1,
              }),
            }}
          />
        )}
        {isLightning && ln.status === "loading" && (
          <p className="text-sm text-stone-500">{dict.pay.lnLoading}</p>
        )}
        {isLightning && ln.status === "error" && (
          <p className="text-sm text-negative">{dict.pay.lnError}</p>
        )}

        <button
          onClick={copy}
          className="w-full truncate rounded-xl border border-stone-300 bg-surface px-4 py-3 font-mono text-sm font-semibold transition-colors hover:border-primary"
        >
          {copied
            ? dict.pay.copied
            : isLightning && ln.status === "ready"
              ? `${dict.pay.lnCopyInvoice}  ·  ${dict.pay.copy}`
              : `${pretty}  ·  ${dict.pay.copy}`}
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
        ) : isLightning ? (
          ln.status === "ready" && (
            <>
              <p className="text-sm text-stone-500">{dict.pay.lnScan}</p>
              <a
                href={`lightning:${ln.pr}`}
                onClick={() => track("lightning_app_opened")}
                className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
              >
                {dict.pay.openLightning}
              </a>
            </>
          )
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

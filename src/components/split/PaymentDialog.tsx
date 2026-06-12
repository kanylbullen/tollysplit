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
  /** Set if the recipient's payment details ever changed from the original. */
  changedAt: string | null;
  amountCents: number;
  currency: string;
  message: string;
};

type LnState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; sats: number; pr: string }
  | { status: "error" };

type EvmState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; address: string; usd: number | null }
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
  const [evm, setEvm] = useState<EvmState>({ status: "idle" });

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

  // EVM: resolve ENS to the actual address (the QR encodes the address) and
  // fetch the debt ≈ in USD — token/chain is the payer's choice, and the
  // stablecoins people actually use are dollar-denominated.
  useEffect(() => {
    if (!open || !payment || method?.type !== "evm") {
      setEvm({ status: "idle" });
      return;
    }
    let cancelled = false;
    setEvm({ status: "loading" });
    (async () => {
      try {
        let address = method.value;
        if (!address.startsWith("0x")) {
          const res = await fetch(
            `/api/ens?name=${encodeURIComponent(address)}`
          ).then((r) => r.json());
          if (typeof res.address !== "string") throw new Error();
          address = res.address;
        }
        let usd: number | null = null;
        if (payment.currency === "USD") {
          usd = payment.amountCents / 100;
        } else {
          const fx = await fetch(`/api/fx?from=${payment.currency}&to=USD`)
            .then((r) => r.json())
            .catch(() => null);
          if (fx && typeof fx.rate === "number") {
            usd = (payment.amountCents / 100) * fx.rate;
          }
        }
        if (!cancelled) setEvm({ status: "ready", address, usd });
      } catch {
        if (!cancelled) setEvm({ status: "error" });
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
  const isEvm = type === "evm";
  const pretty = formatPayment(type, method.value);
  const label = PAYMENT_META[type].label;
  const amount = formatMoney(payment.amountCents, payment.currency, LOCALE_INTL[locale]);
  const qrSrc = `/api/swish-qr?number=${method.value}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  async function copy() {
    if (!method) return;
    const text =
      isLightning && ln.status === "ready"
        ? ln.pr
        : isEvm && evm.status === "ready"
          ? evm.address
          : method.value;
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
          {/* The wallet shows only the invoice, not who is behind it — show
              the recipient's lightning address here so it can be verified. */}
          {isLightning && (
            <p className="mt-1 break-all font-mono text-sm font-semibold">
              ⚡ {method.value}
            </p>
          )}
          {isEvm && evm.status === "ready" && evm.usd !== null && payment.currency !== "USD" && (
            <p className="text-sm font-semibold text-stone-500">
              ≈ {new Intl.NumberFormat(LOCALE_INTL[locale], {
                maximumFractionDigits: 2,
              }).format(evm.usd)}{" "}
              USD
            </p>
          )}
          {isEvm && (
            <p className="mt-1 break-all font-mono text-sm font-semibold">
              Ξ {method.value}
            </p>
          )}
          {/* ENS names are re-pointable — always surface the resolved 0x
              address; it's also what the QR encodes. */}
          {isEvm && evm.status === "ready" && !method.value.startsWith("0x") && (
            <p className="break-all font-mono text-xs text-stone-500">
              {evm.address}
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

        {payment.changedAt && (
          // text-red-700, not -800: the dark theme flips red-50/red-700 in
          // globals.css; -800 would stay dark-on-dark.
          <p className="w-full rounded-xl bg-red-50 px-3.5 py-2.5 text-left text-xs font-semibold text-red-700">
            🚨{" "}
            {t(dict.pay.changedWarning, {
              date: new Date(payment.changedAt).toLocaleDateString(
                LOCALE_INTL[locale]
              ),
            })}
          </p>
        )}
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-left text-xs text-amber-800">
          ⚠️ {dict.pay.verifyWarning}
          {(isLightning || isEvm) && ` ${dict.pay.cryptoIrreversible}`}
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

        {isEvm && evm.status === "ready" && (
          <div
            className="h-[220px] w-[220px] rounded-xl border border-stone-200 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
            aria-label={`Adress-QR till ${payment.toName}`}
            dangerouslySetInnerHTML={{
              __html: renderSVG(evm.address, { ecc: "M", border: 1 }),
            }}
          />
        )}
        {isEvm && evm.status === "loading" && (
          <p className="text-sm text-stone-500">{dict.pay.evmLoading}</p>
        )}
        {isEvm && evm.status === "error" && (
          <p className="text-sm text-negative">{dict.pay.evmError}</p>
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
        ) : isEvm ? (
          evm.status === "ready" && (
            <>
              <p className="text-sm text-stone-500">{dict.pay.evmNote}</p>
              {/* metamask.app.link, not link.metamask.io — the latter 404s
                  in-app; this is the domain MetaMask's own deeplink
                  generator uses. No chainId on purpose: recipient prefilled,
                  network choice stays with the payer. */}
              <a
                href={`https://metamask.app.link/send/${evm.address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("metamask_opened")}
                className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
              >
                {dict.pay.openMetaMask}
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

"use client";

import { track } from "@vercel/analytics";
import { Dialog } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { formatSwishNumber, swishAppLink } from "@/lib/swish";

export type SwishPayment = {
  fromName: string;
  toName: string;
  toNumber: string;
  amountCents: number;
  message: string;
};

export function SwishDialog({
  open,
  onClose,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  payment: SwishPayment | null;
}) {
  if (!payment) return null;

  const qrSrc = `/api/swish-qr?number=${payment.toNumber}&amount=${payment.amountCents}&msg=${encodeURIComponent(payment.message)}`;

  return (
    <Dialog open={open} onClose={onClose} title={`Swisha ${payment.toName}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-stone-500">
          <span className="font-semibold text-ink">{payment.fromName}</span>{" "}
          swishar{" "}
          <span className="font-semibold text-ink">{payment.toName}</span> på{" "}
          {formatSwishNumber(payment.toNumber)}
        </p>
        <p className="text-3xl font-black tracking-tight">
          {formatMoney(payment.amountCents, "SEK")}
        </p>
        {open && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrSrc}
            alt={`Swish-QR till ${payment.toName}`}
            width={220}
            height={220}
            className="rounded-xl border border-stone-200 bg-white p-2"
          />
        )}
        <p className="text-sm text-stone-500">
          Scanna QR-koden med Swish-appen, eller öppna Swish direkt på den här
          enheten:
        </p>
        <a
          href={swishAppLink(payment.toNumber, payment.amountCents, payment.message)}
          onClick={() => track("swish_app_opened")}
          className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          Öppna Swish-appen
        </a>
        <p className="text-xs text-stone-400">
          Glöm inte att trycka ”Markera betald” när betalningen är gjord —
          Swish säger inte till oss själv.
        </p>
      </div>
    </Dialog>
  );
}

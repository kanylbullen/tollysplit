export type PaymentType = "swish" | "vipps" | "mobilepay" | "iban" | "revolut";

type PaymentMeta = {
  label: string;
  /** Country hint shown next to the label. */
  hint: string;
  kind: "phone" | "iban" | "revtag";
  placeholder: string;
};

export const PAYMENT_META: Record<PaymentType, PaymentMeta> = {
  swish: { label: "Swish", hint: "SE", kind: "phone", placeholder: "070-123 45 67" },
  vipps: { label: "Vipps", hint: "NO", kind: "phone", placeholder: "412 34 567" },
  mobilepay: { label: "MobilePay", hint: "DK/FI", kind: "phone", placeholder: "12 34 56 78" },
  revolut: { label: "Revolut", hint: "revtag", kind: "revtag", placeholder: "@dittnamn" },
  iban: { label: "IBAN", hint: "", kind: "iban", placeholder: "SE35 5000 0000 0549 1000 0003" },
};

export const PAYMENT_TYPES = Object.keys(PAYMENT_META) as PaymentType[];

/** Strip formatting; returns canonical value, or null if invalid for the type. */
export function normalizePayment(type: PaymentType, input: string): string | null {
  if (PAYMENT_META[type].kind === "iban") {
    const clean = input.replace(/\s/g, "").toUpperCase();
    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$/.test(clean) ? clean : null;
  }
  if (PAYMENT_META[type].kind === "revtag") {
    // Revtags are case-insensitive; store lowercase without the leading '@'.
    const clean = input.trim().replace(/^@/, "").toLowerCase();
    return /^[a-z0-9]{4,30}$/.test(clean) ? clean : null;
  }
  // phone-type (swish/vipps/mobilepay)
  const clean = input.replace(/[\s\-()./]/g, "");
  return /^\+?[0-9]{6,15}$/.test(clean) ? clean : null;
}

/** Pretty-print a stored payment value for display. */
export function formatPayment(type: PaymentType, value: string): string {
  if (PAYMENT_META[type].kind === "iban") {
    return value.replace(/(.{4})/g, "$1 ").trim();
  }
  if (type === "revolut") {
    return `@${value}`;
  }
  // Swedish Swish numbers get the familiar grouping; others shown as-is.
  if (type === "swish" && /^07\d{8}$/.test(value)) {
    return `${value.slice(0, 3)}-${value.slice(3, 6)} ${value.slice(6, 8)} ${value.slice(8)}`;
  }
  return value;
}

/** True when this method supports a prefilled QR + app link (Swish only). */
export function hasRichLink(type: PaymentType): boolean {
  return type === "swish";
}

/** True when this method opens a one-tap deep link to pay (Revolut). */
export function hasAppLink(type: PaymentType): boolean {
  return type === "revolut";
}

/**
 * Revolut.me deep link — opens Revolut to pay this revtag. Revolut only honours
 * the bare profile path; amount can't be prefilled in a static revtag link
 * (amount-bearing links are generated in-app), so the payer enters it manually.
 */
export function revolutLink(tag: string): string {
  return `https://revolut.me/${tag}`;
}

/** Official Swish app link — opens the Swish app with everything prefilled. */
export function swishAppLink(
  number: string,
  amountCents: number,
  message: string
): string {
  const params = new URLSearchParams({
    sw: number,
    amt: (amountCents / 100).toFixed(2),
    cur: "SEK",
    msg: message.slice(0, 50),
  });
  return `https://app.swish.nu/1/p/sw/?${params.toString()}`;
}

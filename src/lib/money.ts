import type { Entry, Participant } from "./types";

export const CURRENCIES = [
  "SEK",
  "EUR",
  "USD",
  "NOK",
  "DKK",
  "GBP",
  "CHF",
  "PLN",
  "THB",
] as const;

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parse a user-typed amount ("123", "123,45", "1 234.50") into cents. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}

/**
 * Per-participant cost of an expense, in cents.
 * Exact mode: any share with amount_cents set → those amounts are used as-is.
 * Weight mode: amount split by weights, remainder cents distributed by
 * largest fractional part (stable on share order).
 */
export function expenseSplit(entry: Entry): Map<string, number> {
  const result = new Map<string, number>();
  if (entry.shares.length === 0) return result;

  const exact = entry.shares.some((s) => s.amount_cents !== null);
  if (exact) {
    for (const s of entry.shares) result.set(s.participant_id, s.amount_cents ?? 0);
    return result;
  }

  const totalWeight = entry.shares.reduce((sum, s) => sum + s.weight, 0);
  const raw = entry.shares.map((s) => (entry.amount_cents * s.weight) / totalWeight);
  const floored = raw.map(Math.floor);
  let remainder = entry.amount_cents - floored.reduce((a, b) => a + b, 0);

  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floored[index] += 1;
    remainder -= 1;
  }

  entry.shares.forEach((s, i) => result.set(s.participant_id, floored[i]));
  return result;
}

/** Net balance per participant: positive = should get money back. */
export function balances(participants: Participant[], entries: Entry[]): Map<string, number> {
  const bal = new Map<string, number>(participants.map((p) => [p.id, 0]));
  const add = (id: string, cents: number) => bal.set(id, (bal.get(id) ?? 0) + cents);

  for (const entry of entries) {
    add(entry.paid_by, entry.amount_cents);
    if (entry.kind === "transfer" && entry.transfer_to) {
      add(entry.transfer_to, -entry.amount_cents);
    } else {
      for (const [pid, cents] of expenseSplit(entry)) add(pid, -cents);
    }
  }
  return bal;
}

export type Settlement = { from: string; to: string; amount_cents: number };

/** Greedy minimal-ish settlement plan: largest debtor pays largest creditor. */
export function settlements(bal: Map<string, number>): Settlement[] {
  const debtors = [...bal.entries()]
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }));
  const creditors = [...bal.entries()]
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }));
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const plan: Settlement[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].amount, creditors[c].amount);
    if (pay > 0) plan.push({ from: debtors[d].id, to: creditors[c].id, amount_cents: pay });
    debtors[d].amount -= pay;
    creditors[c].amount -= pay;
    if (debtors[d].amount === 0) d += 1;
    if (creditors[c].amount === 0) c += 1;
  }
  return plan;
}

/** Each participant's share of all expenses (transfers excluded). */
export function shareOfTotal(
  participants: Participant[],
  entries: Entry[]
): Map<string, number> {
  const map = new Map<string, number>(participants.map((p) => [p.id, 0]));
  for (const entry of entries) {
    if (entry.kind !== "expense") continue;
    for (const [pid, cents] of expenseSplit(entry)) {
      map.set(pid, (map.get(pid) ?? 0) + cents);
    }
  }
  return map;
}

/** Sum of all expense entries (transfers excluded). */
export function totalSpent(entries: Entry[]): number {
  return entries
    .filter((e) => e.kind === "expense")
    .reduce((sum, e) => sum + e.amount_cents, 0);
}

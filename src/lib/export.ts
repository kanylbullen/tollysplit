import type { SplitData } from "./types";
import { balances, expenseSplit, settlements } from "./money";

function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "tollysplit"
  );
}

/** Full structured export — everything needed to reconstruct the split. */
export function exportJson(data: SplitData) {
  const { split, participants, entries } = data;
  const nameOf = new Map(participants.map((p) => [p.id, p.name]));
  const payload = {
    exported_at: new Date().toISOString(),
    split: { title: split.title, currency: split.currency, created_at: split.created_at },
    participants: participants.map((p) => ({
      name: p.name,
      payment_methods: p.payment_methods,
    })),
    entries: entries.map((e) => ({
      date: e.entry_date,
      type: e.kind,
      description: e.description,
      paid_by: nameOf.get(e.paid_by) ?? null,
      transfer_to: e.transfer_to ? (nameOf.get(e.transfer_to) ?? null) : null,
      amount: e.amount_cents / 100,
      currency: split.currency,
      original_amount: e.orig_amount_cents != null ? e.orig_amount_cents / 100 : null,
      original_currency: e.orig_currency,
      fx_rate: e.fx_rate,
      shares:
        e.kind === "expense"
          ? [...expenseSplit(e)].map(([pid, cents]) => ({
              participant: nameOf.get(pid) ?? null,
              amount: cents / 100,
            }))
          : null,
    })),
    balances: participants.map((p) => ({
      name: p.name,
      balance: (balances(participants, entries).get(p.id) ?? 0) / 100,
    })),
    settlements: settlements(balances(participants, entries)).map((s) => ({
      from: nameOf.get(s.from) ?? null,
      to: nameOf.get(s.to) ?? null,
      amount: s.amount_cents / 100,
    })),
  };
  downloadBlob(
    `${slug(split.title)}.json`,
    "application/json",
    JSON.stringify(payload, null, 2)
  );
}

function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flat expense matrix: one row per entry, a share column per participant. */
export function exportCsv(data: SplitData) {
  const { split, participants, entries } = data;
  const nameOf = new Map(participants.map((p) => [p.id, p.name]));

  const header = [
    "Date",
    "Type",
    "Description",
    "Paid by",
    "To",
    `Amount (${split.currency})`,
    "Original amount",
    "Original currency",
    ...participants.map((p) => p.name),
  ];

  const rows = entries.map((e) => {
    const shareMap = e.kind === "expense" ? expenseSplit(e) : new Map<string, number>();
    return [
      e.entry_date,
      e.kind,
      e.description ?? "",
      nameOf.get(e.paid_by) ?? "",
      e.transfer_to ? (nameOf.get(e.transfer_to) ?? "") : "",
      (e.amount_cents / 100).toFixed(2),
      e.orig_amount_cents != null ? (e.orig_amount_cents / 100).toFixed(2) : "",
      e.orig_currency ?? "",
      ...participants.map((p) => {
        const cents = shareMap.get(p.id);
        return cents != null ? (cents / 100).toFixed(2) : "";
      }),
    ];
  });

  const bal = balances(participants, entries);
  const balanceRow = [
    "",
    "balance",
    "Net balance (positive = owed)",
    "",
    "",
    "",
    "",
    "",
    ...participants.map((p) => ((bal.get(p.id) ?? 0) / 100).toFixed(2)),
  ];

  const csv = [header, ...rows, balanceRow]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  // Prepend a BOM so Excel reads UTF-8 (å/ä/ö) correctly.
  downloadBlob(`${slug(split.title)}.csv`, "text/csv;charset=utf-8", "﻿" + csv);
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { track } from "@vercel/analytics";
import type { Entry, EntryKind, Participant } from "@/lib/types";
import { formatMoney, parseAmount } from "@/lib/money";
import {
  deleteEntryAction,
  saveEntryAction,
  type EntryInput,
} from "@/app/k/[key]/actions";
import { Button, Dialog, Input, Label, Select } from "@/components/ui";
import { todayIso } from "./helpers";

type SplitMode = "equal" | "parts" | "exact";

function centsToText(cents: number): string {
  return cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2).replace(".", ",");
}

export function EntryDialog({
  open,
  onClose,
  kittyKey,
  participants,
  currency,
  entry,
  initialKind,
  meId,
}: {
  open: boolean;
  onClose: () => void;
  kittyKey: string;
  participants: Participant[];
  currency: string;
  entry: Entry | null;
  initialKind: EntryKind;
  meId: string | null;
}) {
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayIso());
  const [paidBy, setPaidBy] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [parts, setParts] = useState<Record<string, string>>({});
  const [exact, setExact] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-seed form state each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (entry) {
      setKind(entry.kind);
      setDescription(entry.description ?? "");
      setAmountText(centsToText(entry.amount_cents));
      setDate(entry.entry_date);
      setPaidBy(entry.paid_by);
      setTransferTo(entry.transfer_to ?? "");
      const hasExact = entry.shares.some((s) => s.amount_cents !== null);
      const allEqual = entry.shares.every((s) => Number(s.weight) === 1);
      setSplitMode(hasExact ? "exact" : allEqual ? "equal" : "parts");
      setIncluded(new Set(entry.shares.map((s) => s.participant_id)));
      setParts(
        Object.fromEntries(
          entry.shares.map((s) => [s.participant_id, String(Number(s.weight))])
        )
      );
      setExact(
        Object.fromEntries(
          entry.shares.map((s) => [
            s.participant_id,
            s.amount_cents !== null ? centsToText(s.amount_cents) : "",
          ])
        )
      );
    } else {
      setKind(initialKind);
      setDescription("");
      setAmountText("");
      setDate(todayIso());
      setPaidBy(meId && participants.some((p) => p.id === meId) ? meId : (participants[0]?.id ?? ""));
      setTransferTo("");
      setSplitMode("equal");
      setIncluded(new Set(participants.map((p) => p.id)));
      setParts({});
      setExact({});
    }
  }, [open, entry, initialKind, meId, participants]);

  const amountCents = parseAmount(amountText);

  const exactSum = useMemo(() => {
    let sum = 0;
    for (const id of included) {
      const cents = parseAmount(exact[id] ?? "");
      if (cents !== null) sum += cents;
    }
    return sum;
  }, [included, exact]);

  function toggleIncluded(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildShares(): EntryInput["shares"] | string {
    if (kind === "transfer") return [];
    const ids = participants.filter((p) => included.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return "Minst en person måste vara med och dela.";
    if (splitMode === "equal") {
      return ids.map((id) => ({ participant_id: id, weight: 1 }));
    }
    if (splitMode === "parts") {
      const shares: EntryInput["shares"] = [];
      for (const id of ids) {
        const weight = parseFloat((parts[id] ?? "1").replace(",", "."));
        if (!Number.isFinite(weight) || weight <= 0) {
          return "Alla andelar måste vara större än noll.";
        }
        shares.push({ participant_id: id, weight });
      }
      return shares;
    }
    // exact
    const shares: EntryInput["shares"] = [];
    for (const id of ids) {
      const cents = parseAmount(exact[id] ?? "");
      if (cents === null && (exact[id] ?? "").trim() !== "" && exact[id] !== "0") {
        return "Ogiltigt belopp i fördelningen.";
      }
      shares.push({ participant_id: id, amount_cents: cents ?? 0 });
    }
    if (amountCents !== null && exactSum !== amountCents) {
      return `Fördelningen (${formatMoney(exactSum, currency)}) måste bli exakt ${formatMoney(amountCents, currency)}.`;
    }
    return shares;
  }

  function save() {
    setError(null);
    if (amountCents === null) {
      setError("Ange ett giltigt belopp, t.ex. 249 eller 123,50.");
      return;
    }
    if (!paidBy) {
      setError("Välj vem som betalade.");
      return;
    }
    if (kind === "transfer" && (!transferTo || transferTo === paidBy)) {
      setError("Välj en mottagare (en annan person än avsändaren).");
      return;
    }
    const shares = buildShares();
    if (typeof shares === "string") {
      setError(shares);
      return;
    }

    const input: EntryInput = {
      id: entry?.id,
      kind,
      description: description.trim() || undefined,
      amount_cents: amountCents,
      paid_by: paidBy,
      transfer_to: kind === "transfer" ? transferTo : undefined,
      entry_date: date,
      shares,
    };

    startTransition(async () => {
      const result = await saveEntryAction(kittyKey, input);
      if (!result.ok) setError(result.error);
      else {
        track("entry_saved", { kind, isEdit: Boolean(entry) });
        onClose();
      }
    });
  }

  function remove() {
    if (!entry) return;
    startTransition(async () => {
      const result = await deleteEntryAction(kittyKey, entry.id);
      if (!result.ok) setError(result.error);
      else onClose();
    });
  }

  const title = entry
    ? entry.kind === "transfer"
      ? "Redigera överföring"
      : "Redigera utgift"
    : kind === "transfer"
      ? "Ny överföring"
      : "Ny utgift";

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {!entry && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
            {(
              [
                ["expense", "Utgift"],
                ["transfer", "Överföring"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  kind === value
                    ? "bg-surface text-ink shadow-sm"
                    : "text-stone-500 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {kind === "expense" && (
          <div>
            <Label htmlFor="entry-desc">Vad gäller det?</Label>
            <Input
              id="entry-desc"
              placeholder="t.ex. Middag på fjället"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="entry-amount">Belopp ({currency})</Label>
            <Input
              id="entry-amount"
              inputMode="decimal"
              placeholder="0"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="entry-date">Datum</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="entry-payer">
              {kind === "transfer" ? "Från" : "Vem betalade?"}
            </Label>
            <Select
              id="entry-payer"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          {kind === "transfer" && (
            <div>
              <Label htmlFor="entry-recipient">Till</Label>
              <Select
                id="entry-recipient"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              >
                <option value="">Välj person…</option>
                {participants
                  .filter((p) => p.id !== paidBy)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>

        {kind === "expense" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Delas av</Label>
              <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5">
                {(
                  [
                    ["equal", "Lika"],
                    ["parts", "Andelar"],
                    ["exact", "Belopp"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSplitMode(value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      splitMode === value
                        ? "bg-surface text-ink shadow-sm"
                        : "text-stone-500 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-stone-200">
              {participants.map((p, i) => {
                const checked = included.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-stone-100" : ""} ${checked ? "" : "opacity-50"}`}
                  >
                    <input
                      type="checkbox"
                      id={`share-${p.id}`}
                      checked={checked}
                      onChange={() => toggleIncluded(p.id)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <label
                      htmlFor={`share-${p.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                    >
                      {p.name}
                    </label>
                    {checked && splitMode === "parts" && (
                      <input
                        inputMode="decimal"
                        value={parts[p.id] ?? "1"}
                        onChange={(e) =>
                          setParts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-right text-sm outline-none focus:border-primary"
                        aria-label={`Andelar för ${p.name}`}
                      />
                    )}
                    {checked && splitMode === "exact" && (
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        value={exact[p.id] ?? ""}
                        onChange={(e) =>
                          setExact((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-stone-300 px-2 py-1.5 text-right text-sm outline-none focus:border-primary"
                        aria-label={`Belopp för ${p.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {splitMode === "exact" && amountCents !== null && (
              <p
                className={`mt-1.5 text-xs ${exactSum === amountCents ? "text-positive" : "text-stone-500"}`}
              >
                Fördelat: {formatMoney(exactSum, currency)} av{" "}
                {formatMoney(amountCents, currency)}
                {exactSum !== amountCents &&
                  ` — ${formatMoney(Math.abs(amountCents - exactSum), currency)} ${exactSum < amountCents ? "kvar" : "för mycket"}`}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {entry &&
            (confirmDelete ? (
              <Button variant="danger" onClick={remove} disabled={pending}>
                Ta bort?
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="!text-negative"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
              >
                Ta bort
              </Button>
            ))}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Avbryt
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

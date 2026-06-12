"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import type { Split, Participant } from "@/lib/types";
import { CURRENCIES } from "@/lib/money";
import Link from "next/link";
import {
  addParticipantAction,
  deleteParticipantAction,
  renameParticipantAction,
  setAutoPurgeAction,
  setKeepPaymentAction,
  setPaymentMethodsAction,
  updateSplitAction,
} from "@/app/k/[key]/actions";
import {
  PAYMENT_META,
  PAYMENT_TYPES,
  type PaymentType,
  formatPayment,
  normalizePayment,
} from "@/lib/payment";
import { Button, Dialog, Input, Label, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { exportCsv, exportJson } from "@/lib/export";
import type { SplitData } from "@/lib/types";

export function SettingsDialog({
  open,
  onClose,
  split,
  participants,
  entries,
  meId,
  onIdentityReset,
}: {
  open: boolean;
  onClose: () => void;
  split: Split;
  participants: Participant[];
  entries: SplitData["entries"];
  meId: string | null;
  onIdentityReset: () => void;
}) {
  const [title, setTitle] = useState(split.title);
  const [currency, setCurrency] = useState(split.currency);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [payEditing, setPayEditing] = useState<string | null>(null);
  const [payType, setPayType] = useState<PaymentType>("swish");
  const [payText, setPayText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();
  const { dict, t, te } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setTitle(split.title);
      setCurrency(split.currency);
      setNewName("");
      setRenaming(null);
      setError(null);
    }
  }, [open, split.title, split.currency]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(te(result.error ?? "unknown"));
    });
  }

  function addMethod(p: Participant) {
    const normalized = normalizePayment(payType, payText);
    if (!normalized) {
      setError(te("bad_payment_value"));
      return;
    }
    const methods = [
      ...p.payment_methods.map((m) => ({ type: m.type as string, value: m.value })),
      { type: payType as string, value: normalized },
    ];
    run(() => setPaymentMethodsAction(split.key, p.id, methods));
    setPayEditing(null);
    setPayText("");
  }

  function removeMethod(p: Participant, index: number) {
    const methods = p.payment_methods
      .filter((_, i) => i !== index)
      .map((m) => ({ type: m.type as string, value: m.value }));
    run(() => setPaymentMethodsAction(split.key, p.id, methods));
  }

  const dirty = title.trim() !== split.title || currency !== split.currency;

  return (
    <Dialog open={open} onClose={onClose} title={dict.set.title}>
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <Label htmlFor="split-title">{dict.set.name}</Label>
            <Input
              id="split-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="split-currency">{dict.set.currency}</Label>
            <Select
              id="split-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {dirty && (
            <Button
              onClick={() =>
                run(() => updateSplitAction(split.key, title, currency))
              }
              disabled={pending || title.trim().length === 0}
            >
              {dict.set.saveChanges}
            </Button>
          )}
        </section>

        <section>
          <Label>{dict.set.participants}</Label>
          <div className="overflow-hidden rounded-xl border border-stone-200">
            {participants.map((p, i) => (
              <div
                key={p.id}
                className={`px-3 py-2.5 ${i > 0 ? "border-t border-stone-100" : ""}`}
              >
              <div className="flex items-center gap-2">
                {renaming === p.id ? (
                  <>
                    <input
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        run(() =>
                          renameParticipantAction(split.key, p.id, renameText)
                        );
                        setRenaming(null);
                      }}
                      disabled={pending || renameText.trim().length === 0}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      {dict.common.save}
                    </button>
                    <button
                      onClick={() => setRenaming(null)}
                      className="text-sm text-stone-400 hover:text-ink"
                    >
                      {dict.common.cancel}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {p.name}
                      {meId === p.id && (
                        <span className="ml-1.5 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-bold text-primary-dark">
                          {dict.common.you}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setRenaming(p.id);
                        setRenameText(p.name);
                      }}
                      className="text-sm text-stone-400 hover:text-ink"
                    >
                      {dict.set.rename}
                    </button>
                    <button
                      onClick={() =>
                        run(() => deleteParticipantAction(split.key, p.id))
                      }
                      disabled={pending}
                      className="text-sm text-stone-400 hover:text-negative"
                    >
                      {dict.common.delete}
                    </button>
                  </>
                )}
              </div>
              <div className="mt-1.5 space-y-1.5">
                {p.payment_methods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.payment_methods.map((m, idx) => (
                      <span
                        key={`${m.type}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1 text-xs"
                      >
                        <span className="font-semibold">{PAYMENT_META[m.type].label}</span>
                        <span className="text-stone-500">
                          {formatPayment(m.type, m.value)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMethod(p, idx)}
                          disabled={pending}
                          aria-label={dict.common.delete}
                          className="-mr-0.5 ml-0.5 text-base leading-none text-stone-400 hover:text-negative"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {payEditing === p.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addMethod(p);
                    }}
                  >
                    <select
                      value={payType}
                      onChange={(e) => setPayType(e.target.value as PaymentType)}
                      className="rounded-lg border border-stone-300 bg-surface px-1.5 py-1.5 text-sm outline-none focus:border-primary"
                    >
                      {PAYMENT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {PAYMENT_META[pt].label}
                        </option>
                      ))}
                    </select>
                    <input
                      inputMode={PAYMENT_META[payType].kind === "phone" ? "tel" : "text"}
                      placeholder={PAYMENT_META[payType].placeholder}
                      value={payText}
                      onChange={(e) => setPayText(e.target.value)}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      {dict.common.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayEditing(null);
                        setPayText("");
                      }}
                      className="text-sm text-stone-400 hover:text-ink"
                    >
                      {dict.common.cancel}
                    </button>
                  </form>
                ) : (
                  p.payment_methods.length < 8 && (
                    <button
                      onClick={() => {
                        setPayEditing(p.id);
                        setPayType("swish");
                        setPayText("");
                      }}
                      className="text-xs text-stone-400 hover:text-primary-dark"
                    >
                      {p.payment_methods.length > 0
                        ? dict.set.payAddAnother
                        : dict.set.payAdd}
                    </button>
                  )
                )}
              </div>
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              run(() => addParticipantAction(split.key, name));
              setNewName("");
            }}
          >
            <Input
              placeholder={dict.set.newParticipant}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || newName.trim().length === 0}
            >
              {dict.set.add}
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-stone-400">
            {dict.set.cantDeleteHint}
          </p>
        </section>

        <section>
          <Label>{dict.set.appearance}</Label>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
            {(
              [
                ["light", dict.set.light],
                ["dark", dict.set.dark],
                ["system", dict.set.system],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mounted && theme === value
                    ? "bg-surface text-ink shadow-sm"
                    : "text-stone-500 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">{dict.set.systemHint}</p>
        </section>

        <section>
          <Label>{dict.switcher.label}</Label>
          <LocaleSwitcher />
        </section>

        <section>
          <Label>{dict.set.dataExport}</Label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => exportJson({ split, participants, entries })}
            >
              JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() => exportCsv({ split, participants, entries })}
            >
              CSV
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-stone-400">{dict.set.dataExportHint}</p>
        </section>

        <section>
          <Label>{dict.set.privacy}</Label>
          <label className="mb-2 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={split.keep_payment_methods}
              disabled={pending}
              onChange={(e) =>
                run(() => setKeepPaymentAction(split.key, e.target.checked))
              }
              className="mt-0.5 h-4 w-4 accent-teal-600"
            />
            <span>
              {dict.set.keepPaymentToggle}
              <span className="block text-xs text-stone-400">
                {dict.set.keepPaymentHint}
              </span>
            </span>
          </label>
          {split.has_owner ? (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={split.auto_purge}
                disabled={pending}
                onChange={(e) =>
                  run(() => setAutoPurgeAction(split.key, e.target.checked))
                }
                className="mt-0.5 h-4 w-4 accent-teal-600"
              />
              <span>{dict.set.purgeToggle}</span>
            </label>
          ) : (
            <p className="text-sm text-stone-500">{dict.set.purgeAnon}</p>
          )}
          <p className="mt-1.5 text-xs text-stone-400">
            {dict.set.purgeHint1}{" "}
            <Link
              href="/privacy"
              className="text-primary hover:text-primary-dark"
            >
              {dict.set.privacyLink}
            </Link>
            .
          </p>
        </section>

        <section>
          <button
            onClick={() => {
              onIdentityReset();
              onClose();
            }}
            className="text-sm font-medium text-primary hover:text-primary-dark"
          >
            {dict.set.changeIdentity}
          </button>
        </section>

        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    </Dialog>
  );
}

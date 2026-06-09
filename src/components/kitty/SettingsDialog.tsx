"use client";

import { useEffect, useState, useTransition } from "react";
import type { Kitty, Participant } from "@/lib/types";
import { CURRENCIES } from "@/lib/money";
import {
  addParticipantAction,
  deleteParticipantAction,
  renameParticipantAction,
  updateKittyAction,
} from "@/app/k/[key]/actions";
import { Button, Dialog, Input, Label, Select } from "@/components/ui";

export function SettingsDialog({
  open,
  onClose,
  kitty,
  participants,
  meId,
  onIdentityReset,
}: {
  open: boolean;
  onClose: () => void;
  kitty: Kitty;
  participants: Participant[];
  meId: string | null;
  onIdentityReset: () => void;
}) {
  const [title, setTitle] = useState(kitty.title);
  const [currency, setCurrency] = useState(kitty.currency);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(kitty.title);
      setCurrency(kitty.currency);
      setNewName("");
      setRenaming(null);
      setError(null);
    }
  }, [open, kitty.title, kitty.currency]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Något gick fel.");
    });
  }

  const dirty = title.trim() !== kitty.title || currency !== kitty.currency;

  return (
    <Dialog open={open} onClose={onClose} title="Inställningar">
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <Label htmlFor="kitty-title">Namn</Label>
            <Input
              id="kitty-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="kitty-currency">Valuta</Label>
            <Select
              id="kitty-currency"
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
                run(() => updateKittyAction(kitty.key, title, currency))
              }
              disabled={pending || title.trim().length === 0}
            >
              Spara ändringar
            </Button>
          )}
        </section>

        <section>
          <Label>Deltagare</Label>
          <div className="overflow-hidden rounded-xl border border-stone-200">
            {participants.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? "border-t border-stone-100" : ""}`}
              >
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
                          renameParticipantAction(kitty.key, p.id, renameText)
                        );
                        setRenaming(null);
                      }}
                      disabled={pending || renameText.trim().length === 0}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      Spara
                    </button>
                    <button
                      onClick={() => setRenaming(null)}
                      className="text-sm text-stone-400 hover:text-ink"
                    >
                      Avbryt
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {p.name}
                      {meId === p.id && (
                        <span className="ml-1.5 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-bold text-primary-dark">
                          du
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
                      Byt namn
                    </button>
                    <button
                      onClick={() =>
                        run(() => deleteParticipantAction(kitty.key, p.id))
                      }
                      disabled={pending}
                      className="text-sm text-stone-400 hover:text-negative"
                    >
                      Ta bort
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              run(() => addParticipantAction(kitty.key, name));
              setNewName("");
            }}
          >
            <Input
              placeholder="Ny deltagare"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || newName.trim().length === 0}
            >
              Lägg till
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-stone-400">
            Deltagare med bokförda poster kan inte tas bort.
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
            Byt vem du är på den här enheten
          </button>
        </section>

        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    </Dialog>
  );
}

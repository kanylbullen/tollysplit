"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/money";
import { createKittyAction } from "./actions";

export function NewKittyForm() {
  const [state, formAction, pending] = useActionState(createKittyAction, null);
  const [nameCount, setNameCount] = useState(3);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="title">Namn</Label>
        <Input
          id="title"
          name="title"
          placeholder="t.ex. Skidresan 2026"
          required
          maxLength={80}
        />
      </div>

      <div>
        <Label htmlFor="currency">Valuta</Label>
        <Select id="currency" name="currency" defaultValue="SEK">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Deltagare</Label>
        <div className="space-y-2">
          {Array.from({ length: nameCount }, (_, i) => (
            <Input
              key={i}
              name="name"
              placeholder={`Deltagare ${i + 1}`}
              maxLength={40}
              required={i < 2}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNameCount((n) => n + 1)}
          className="mt-2 text-sm font-medium text-primary hover:text-primary-dark"
        >
          + Lägg till en till
        </button>
        <p className="mt-1 text-xs text-stone-400">
          Du kan lägga till fler deltagare senare också.
        </p>
      </div>

      {state?.error && <p className="text-sm text-negative">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Skapar…" : "Skapa tollesplit"}
      </Button>
    </form>
  );
}

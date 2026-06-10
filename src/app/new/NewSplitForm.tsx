"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/money";
import { useI18n } from "@/lib/i18n/client";
import { createSplitAction } from "./actions";

export function NewSplitForm() {
  const { dict, t, te } = useI18n();
  const [state, formAction, pending] = useActionState(createSplitAction, null);
  const [nameCount, setNameCount] = useState(3);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="title">{dict.new.name}</Label>
        <Input
          id="title"
          name="title"
          placeholder={dict.new.namePlaceholder}
          required
          maxLength={80}
        />
      </div>

      <div>
        <Label htmlFor="currency">{dict.new.currency}</Label>
        <Select id="currency" name="currency" defaultValue="SEK">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>{dict.new.participants}</Label>
        <div className="space-y-2">
          {Array.from({ length: nameCount }, (_, i) => (
            <Input
              key={i}
              name="name"
              placeholder={t(dict.new.participantPlaceholder, { n: i + 1 })}
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
          {dict.new.addAnother}
        </button>
        <p className="mt-1 text-xs text-stone-400">{dict.new.addLaterHint}</p>
      </div>

      {state?.error && (
        <p className="text-sm text-negative">{te(state.error)}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? dict.new.submitting : dict.new.submit}
      </Button>
    </form>
  );
}

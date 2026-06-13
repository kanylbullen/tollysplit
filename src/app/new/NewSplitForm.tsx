"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/money";
import { useI18n } from "@/lib/i18n/client";
import { createSplitAction } from "./actions";

export function NewSplitForm({ loggedIn }: { loggedIn: boolean }) {
  const { dict, t, te } = useI18n();
  const [state, formAction, pending] = useActionState(createSplitAction, null);
  const [nameCount, setNameCount] = useState(3);
  const [secure, setSecure] = useState(false);
  const [claimMode, setClaimMode] = useState<"self" | "invite">("self");
  const invite = secure && claimMode === "invite";

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
            <div key={i} className="space-y-1">
              <Input
                name="name"
                placeholder={t(dict.new.participantPlaceholder, { n: i + 1 })}
                maxLength={40}
                required={i < 2}
              />
              {invite && (
                <Input
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder={dict.new.inviteEmailPlaceholder}
                  maxLength={120}
                  className="text-sm"
                />
              )}
            </div>
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

      {loggedIn && (
        <div className="rounded-2xl border border-stone-200 p-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              name="secure"
              checked={secure}
              onChange={(e) => setSecure(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-teal-600"
            />
            <span>
              <span className="text-sm font-semibold">{dict.new.secureTitle}</span>
              <span className="block text-xs text-stone-400">
                {dict.new.secureHint}
              </span>
            </span>
          </label>

          {secure && (
            <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-stone-500">
                  {dict.new.whoMustLogin}
                </legend>
                <Radio name="access_mode" value="payers" defaultChecked label={dict.new.modePayers} />
                <Radio name="access_mode" value="all" label={dict.new.modeAll} />
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-stone-500">
                  {dict.new.whoCanView}
                </legend>
                <Radio name="visibility" value="link" defaultChecked label={dict.new.visLink} />
                <Radio name="visibility" value="members" label={dict.new.visMembers} />
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-stone-500">
                  {dict.new.howToJoin}
                </legend>
                <Radio
                  name="claim_mode"
                  value="self"
                  defaultChecked
                  label={dict.new.claimSelf}
                  onSelect={() => setClaimMode("self")}
                />
                <Radio
                  name="claim_mode"
                  value="invite"
                  label={dict.new.claimInvite}
                  onSelect={() => setClaimMode("invite")}
                />
              </fieldset>
            </div>
          )}
        </div>
      )}

      {state?.error && <p className="text-sm text-negative">{te(state.error)}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? dict.new.submitting : dict.new.submit}
      </Button>
    </form>
  );
}

function Radio({
  name,
  value,
  label,
  defaultChecked,
  onSelect,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  onSelect?: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={onSelect}
        className="h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  );
}

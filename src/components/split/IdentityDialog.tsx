"use client";

import { useEffect, useRef } from "react";
import type { Participant } from "@/lib/types";
import { Dialog } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { avatarColor, initials } from "./helpers";

export function IdentityDialog({
  open,
  participants,
  onPick,
}: {
  open: boolean;
  participants: Participant[];
  onPick: (id: string) => void;
}) {
  const { dict } = useI18n();
  // The native <dialog> close event fires even after an explicit pick;
  // only fall back to "viewer" when the dialog is dismissed without one.
  const picked = useRef(false);
  useEffect(() => {
    if (open) picked.current = false;
  }, [open]);

  function pick(id: string) {
    picked.current = true;
    onPick(id);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!picked.current) onPick("viewer");
      }}
      title={dict.identity.title}
    >
      <p className="mb-4 text-sm text-stone-500">{dict.identity.body}</p>
      <div className="space-y-2">
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left font-medium transition-colors hover:border-primary hover:bg-primary-soft/40"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(p)}`}
            >
              {initials(p.name)}
            </span>
            {p.name}
          </button>
        ))}
        <button
          onClick={() => pick("viewer")}
          className="w-full rounded-xl px-4 py-3 text-sm text-stone-500 hover:bg-stone-50"
        >
          {dict.identity.justLooking}
        </button>
      </div>
    </Dialog>
  );
}

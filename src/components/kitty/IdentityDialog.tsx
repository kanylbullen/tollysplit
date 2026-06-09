"use client";

import type { Participant } from "@/lib/types";
import { Dialog } from "@/components/ui";
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
  return (
    <Dialog open={open} onClose={() => onPick("viewer")} title="Vem är du?">
      <p className="mb-4 text-sm text-stone-500">
        Välj dig själv så visar vi din andel av varje utgift och vad just du
        ska betala eller få tillbaka.
      </p>
      <div className="space-y-2">
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
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
          onClick={() => onPick("viewer")}
          className="w-full rounded-xl px-4 py-3 text-sm text-stone-500 hover:bg-stone-50"
        >
          Jag vill bara titta
        </button>
      </div>
    </Dialog>
  );
}

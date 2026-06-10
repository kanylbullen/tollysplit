"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Entry, EntryKind, KittyData } from "@/lib/types";
import { BeerButton } from "@/components/BeerButton";
import { EntriesView } from "./EntriesView";
import { BalancesView } from "./BalancesView";
import { EntryDialog } from "./EntryDialog";
import { IdentityDialog } from "./IdentityDialog";
import { SettingsDialog } from "./SettingsDialog";

type Tab = "entries" | "balances";

export function KittyApp({ data }: { data: KittyData }) {
  const { kitty, participants, entries } = data;
  const storageKey = `tollesplit:me:${kitty.key}`;

  const [tab, setTab] = useState<Tab>("balances");
  const [meId, setMeId] = useState<string | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    entry: Entry | null;
    kind: EntryKind;
  }>({ open: false, entry: null, kind: "expense" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored && (stored === "viewer" || participants.some((p) => p.id === stored))) {
      setMeId(stored === "viewer" ? null : stored);
    } else {
      setIdentityOpen(true);
    }
    setIdentityLoaded(true);
  }, [storageKey, participants]);

  function pickIdentity(id: string) {
    localStorage.setItem(storageKey, id);
    setMeId(id === "viewer" ? null : id);
    setIdentityOpen(false);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: kitty.title, url });
        return;
      } catch {
        // fall through to clipboard if the user cancelled the share sheet
      }
    }
    await navigator.clipboard.writeText(url);
    showToast("Länken är kopierad — dela den med gruppen!");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-stone-200/60 bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Till startsidan"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black tracking-tight">
            {kitty.title}
          </h1>
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-soft/70"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5.5L7.5 9M7.5 11l5.5 3.5M16 4.5a2 2 0 11-4 0 2 2 0 014 0zM8 10a2 2 0 11-4 0 2 2 0 014 0zM16 15.5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Dela
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Inställningar"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>

        <nav className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-stone-200/60 p-1">
          {(
            [
              ["balances", "Saldon"],
              ["entries", "Transaktioner"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === value
                  ? "bg-surface text-ink shadow-sm"
                  : "text-stone-500 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="pb-28">
        {tab === "entries" ? (
          <EntriesView
            entries={entries}
            participants={participants}
            currency={kitty.currency}
            meId={meId}
            onEdit={(entry) =>
              setEntryDialog({ open: true, entry, kind: entry.kind })
            }
          />
        ) : (
          <BalancesView
            kittyKey={kitty.key}
            entries={entries}
            participants={participants}
            currency={kitty.currency}
            meId={meId}
            onEditEntry={(entry) =>
              setEntryDialog({ open: true, entry, kind: entry.kind })
            }
          />
        )}
        <footer className="mt-10 flex justify-center">
          <BeerButton />
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200/60 bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            onClick={() =>
              setEntryDialog({ open: true, entry: null, kind: "expense" })
            }
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
          >
            + Ny utgift
          </button>
          <button
            onClick={() =>
              setEntryDialog({ open: true, entry: null, kind: "transfer" })
            }
            className="rounded-xl border border-stone-300 bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-stone-50"
          >
            Överföring
          </button>
        </div>
      </div>

      <EntryDialog
        open={entryDialog.open}
        onClose={() => setEntryDialog((d) => ({ ...d, open: false }))}
        kittyKey={kitty.key}
        participants={participants}
        currency={kitty.currency}
        entry={entryDialog.entry}
        initialKind={entryDialog.kind}
        meId={meId}
      />
      <IdentityDialog
        open={identityLoaded && identityOpen}
        participants={participants}
        onPick={pickIdentity}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        kitty={kitty}
        participants={participants}
        meId={meId}
        onIdentityReset={() => {
          localStorage.removeItem(storageKey);
          setIdentityOpen(true);
        }}
      />

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-cream shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

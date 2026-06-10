"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Entry, EntryKind, SplitData } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { EntriesView } from "./EntriesView";
import { BalancesView } from "./BalancesView";
import { EntryDialog } from "./EntryDialog";
import { IdentityDialog } from "./IdentityDialog";
import { SettingsDialog } from "./SettingsDialog";

type Tab = "entries" | "balances";

export function SplitApp({ data }: { data: SplitData }) {
  const { dict } = useI18n();
  const { split, participants, entries } = data;
  const storageKey = `tollesplit:me:${split.key}`;

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

  // Remember visited splits so the landing page can list them per device.
  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("tollysplit:visited") ?? "[]"
      ) as { key: string; title: string; at: number }[];
      const rest = raw.filter((v) => v.key !== split.key);
      rest.unshift({ key: split.key, title: split.title, at: Date.now() });
      localStorage.setItem("tollysplit:visited", JSON.stringify(rest.slice(0, 50)));
    } catch {
      // corrupt entry — overwrite with just this split
      localStorage.setItem(
        "tollysplit:visited",
        JSON.stringify([{ key: split.key, title: split.title, at: Date.now() }])
      );
    }
  }, [split.key, split.title]);

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
        await navigator.share({ title: split.title, url });
        return;
      } catch {
        // fall through to clipboard if the user cancelled the share sheet
      }
    }
    await navigator.clipboard.writeText(url);
    showToast(dict.split.shareCopied);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-stone-200/60 bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label={dict.common.toStart}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black tracking-tight">
            {split.title}
          </h1>
          <a
            href="https://buymeacoffee.com/xuperfun"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bjud utvecklaren på en öl"
            title="Buy me a beer"
            className="rounded-xl bg-primary-soft px-2.5 py-2 text-sm transition-colors hover:bg-primary-soft/70"
          >
            🍺
          </a>
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-soft/70"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 5.5L7.5 9M7.5 11l5.5 3.5M16 4.5a2 2 0 11-4 0 2 2 0 014 0zM8 10a2 2 0 11-4 0 2 2 0 014 0zM16 15.5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {dict.split.share}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={dict.common.settings}
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
              ["balances", dict.split.tabBalances],
              ["entries", dict.split.tabEntries],
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
            currency={split.currency}
            meId={meId}
            onEdit={(entry) =>
              setEntryDialog({ open: true, entry, kind: entry.kind })
            }
          />
        ) : (
          <BalancesView
            splitKey={split.key}
            splitTitle={split.title}
            entries={entries}
            participants={participants}
            currency={split.currency}
            meId={meId}
            onEditEntry={(entry) =>
              setEntryDialog({ open: true, entry, kind: entry.kind })
            }
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200/60 bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            onClick={() =>
              setEntryDialog({ open: true, entry: null, kind: "expense" })
            }
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
          >
            {dict.split.newExpense}
          </button>
          <button
            onClick={() =>
              setEntryDialog({ open: true, entry: null, kind: "transfer" })
            }
            className="rounded-xl border border-stone-300 bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-stone-50"
          >
            {dict.split.transfer}
          </button>
        </div>
      </div>

      <EntryDialog
        open={entryDialog.open}
        onClose={() => setEntryDialog((d) => ({ ...d, open: false }))}
        splitKey={split.key}
        participants={participants}
        currency={split.currency}
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
        split={split}
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

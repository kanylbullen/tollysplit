"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { setLocaleAction } from "@/lib/i18n/actions";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className="sr-only">{dict.switcher.label}</span>
      <span aria-hidden className="text-stone-400">
        🌐
      </span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocaleAction(next);
            router.refresh();
          });
        }}
        className="cursor-pointer rounded-lg border border-stone-300 bg-surface px-1.5 py-1 text-sm outline-none focus:border-primary"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

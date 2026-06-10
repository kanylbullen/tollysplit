"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";
import { interpolate } from "./format";

type I18nValue = {
  locale: Locale;
  dict: Dict;
  t: (template: string, vars?: Record<string, string | number>) => string;
  /** Translate a server error code (see dict.errors). */
  te: (code: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  const te = (code: string) =>
    (dict.errors as Record<string, string>)[code] ?? dict.errors.unknown;
  return (
    <I18nContext.Provider value={{ locale, dict, t: interpolate, te }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

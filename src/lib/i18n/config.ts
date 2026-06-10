export const LOCALES = ["sv", "nb", "da", "fi", "is", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "tollysplit:locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  sv: "Svenska",
  nb: "Norsk",
  da: "Dansk",
  fi: "Suomi",
  is: "Íslenska",
  en: "English",
};

/** Intl/BCP-47 tag used for number, currency and date formatting. */
export const LOCALE_INTL: Record<Locale, string> = {
  sv: "sv-SE",
  nb: "nb-NO",
  da: "da-DK",
  fi: "fi-FI",
  is: "is-IS",
  en: "en-GB",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Best-match locale from an Accept-Language header, else the default. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    if (base === "no" || base === "nn") return "nb"; // Norwegian variants
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

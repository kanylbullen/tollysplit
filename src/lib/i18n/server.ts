import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  isLocale,
  localeFromAcceptLanguage,
} from "./config";
import { getDictionary, type Dict } from "./dictionaries";
import { interpolate } from "./format";

/** Resolve the active locale: explicit cookie first, else Accept-Language. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getI18n(): Promise<{
  locale: Locale;
  dict: Dict;
  t: typeof interpolate;
}> {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale), t: interpolate };
}

import type { Locale } from "../config";
import type { Dict } from "./sv";
import sv from "./sv";
import en from "./en";
import nb from "./nb";
import da from "./da";
import fi from "./fi";
import is from "./is";

const DICTS: Record<Locale, Dict> = { sv, en, nb, da, fi, is };

export function getDictionary(locale: Locale): Dict {
  return DICTS[locale] ?? en;
}

export type { Dict };

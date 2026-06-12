import type { NextRequest } from "next/server";
import { CURRENCIES } from "@/lib/money";

const VALID = new Set<string>(CURRENCIES);

// Fiat rates: open.er-api.com (free, no key, daily ECB-ish rates incl. ISK).
// Cached for an hour — the rate is locked client-side at input time anyway.
async function usdRates(): Promise<Record<string, number> | null> {
  const upstream = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
  });
  if (!upstream.ok) return null;
  const data = (await upstream.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  return data.result === "success" && data.rates ? data.rates : null;
}

// BTC price: CoinGecko (free, no key). Shorter cache — bitcoin moves faster
// than fiat; the locked-rate model still applies on save.
async function satsInUsd(): Promise<number | null> {
  const upstream = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    { next: { revalidate: 300 } }
  );
  if (!upstream.ok) return null;
  const data = (await upstream.json()) as { bitcoin?: { usd?: number } };
  const btcUsd = data.bitcoin?.usd;
  return typeof btcUsd === "number" && btcUsd > 0 ? btcUsd / 1e8 : null;
}

// Value of 1 unit of `code` in USD. SATS handled by the caller.
function unitInUsd(code: string, rates: Record<string, number>): number | null {
  if (code === "USD") return 1;
  const perUsd = rates[code];
  return typeof perUsd === "number" && perUsd > 0 ? 1 / perUsd : null;
}

// Returns the exchange rate to convert 1 unit of `from` into `to`.
// All pairs are composed through USD so SATS (CoinGecko) and fiat
// (open.er-api) share one code path.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").toUpperCase();
  const to = (searchParams.get("to") ?? "").toUpperCase();

  if (!VALID.has(from) || !VALID.has(to)) {
    return Response.json({ error: "bad_currency" }, { status: 400 });
  }
  if (from === to) {
    return Response.json({ rate: 1 });
  }

  const needsSats = from === "SATS" || to === "SATS";
  const [rates, sats] = await Promise.all([
    usdRates(),
    needsSats ? satsInUsd() : Promise.resolve(null),
  ]);
  if (!rates || (needsSats && !sats)) {
    return Response.json({ error: "fx_unavailable" }, { status: 502 });
  }

  const fromUsd = from === "SATS" ? sats! : unitInUsd(from, rates);
  const toUsd = to === "SATS" ? sats! : unitInUsd(to, rates);
  if (!fromUsd || !toUsd) {
    return Response.json({ error: "fx_unavailable" }, { status: 502 });
  }

  return Response.json(
    { rate: fromUsd / toUsd },
    {
      headers: {
        "Cache-Control": needsSats
          ? "public, max-age=300"
          : "public, max-age=3600",
      },
    }
  );
}

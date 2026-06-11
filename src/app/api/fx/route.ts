import type { NextRequest } from "next/server";
import { CURRENCIES } from "@/lib/money";

const VALID = new Set<string>(CURRENCIES);

// Returns the exchange rate to convert 1 unit of `from` into `to`.
// Source: open.er-api.com (free, no key, daily ECB-ish rates incl. ISK).
// Cached for an hour — the rate is locked client-side at input time anyway.
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

  const upstream = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
    next: { revalidate: 3600 },
  });
  if (!upstream.ok) {
    return Response.json({ error: "fx_unavailable" }, { status: 502 });
  }
  const data = (await upstream.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  const rate = data.rates?.[to];
  if (data.result !== "success" || typeof rate !== "number") {
    return Response.json({ error: "fx_unavailable" }, { status: 502 });
  }

  return Response.json(
    { rate },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

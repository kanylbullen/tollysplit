import type { NextRequest } from "next/server";

// LNURL-pay (LUD-16) resolver: turns a lightning address + amount into a
// BOLT11 invoice. The recipient's wallet provider hosts the endpoint and
// issues the invoice — no funds ever pass through us.
//
// Flow: address "user@domain" → GET https://domain/.well-known/lnurlp/user
// → { callback, minSendable, maxSendable } → GET callback?amount=<msat>
// → { pr: "lnbc..." }.

const ADDRESS_RE =
  /^[a-z0-9._%+-]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

// These requests go to a user-supplied domain (inherent to LNURL — that's the
// protocol), but they must never reach internal or non-public hosts.
function isForbiddenHost(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // IPv4 literal
  if (host.includes(":")) return true; // IPv6 literal / port smuggling
  if (!host.includes(".")) return true; // bare hostname
  return /\.(local|internal|lan|home|corp|localhost|onion)$/.test(host) ||
    host === "localhost";
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        // Some providers (e.g. Alby behind Cloudflare) 429 the default
        // node fetch user-agent.
        "User-Agent": "Tollysplit/1.0 (+https://tollysplit.xuper.fun)",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 64_000) return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Same-origin only — this exists for our own /k pages, not as a public
  // LNURL relay for third parties.
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const address = (searchParams.get("address") ?? "").trim().toLowerCase();
  const msat = Number(searchParams.get("msat") ?? "");

  if (!ADDRESS_RE.test(address) || address.length > 320) {
    return Response.json({ error: "bad_address" }, { status: 400 });
  }
  if (!Number.isInteger(msat) || msat <= 0 || msat > 5_000_000_000_000) {
    return Response.json({ error: "bad_amount" }, { status: 400 });
  }

  const [user, domain] = address.split("@");
  if (isForbiddenHost(domain)) {
    return Response.json({ error: "bad_address" }, { status: 400 });
  }

  // Step 1: LNURL-pay parameters from the recipient's provider.
  const params = await fetchJson(
    `https://${domain}/.well-known/lnurlp/${encodeURIComponent(user)}`
  );
  if (!params || params.tag !== "payRequest" || typeof params.callback !== "string") {
    return Response.json({ error: "lnurl_unavailable" }, { status: 502 });
  }

  let callback: URL;
  try {
    callback = new URL(params.callback);
  } catch {
    return Response.json({ error: "lnurl_unavailable" }, { status: 502 });
  }
  if (callback.protocol !== "https:" || isForbiddenHost(callback.hostname)) {
    return Response.json({ error: "lnurl_unavailable" }, { status: 502 });
  }

  const min = Number(params.minSendable ?? 1000);
  const max = Number(params.maxSendable ?? Number.MAX_SAFE_INTEGER);
  if (msat < min || msat > max) {
    return Response.json(
      { error: "amount_out_of_range", min_msat: min, max_msat: max },
      { status: 400 }
    );
  }

  // Step 2: request the invoice on the exact amount.
  callback.searchParams.set("amount", String(msat));
  const invoice = await fetchJson(callback.toString());
  const pr = invoice?.pr;
  if (typeof pr !== "string" || !/^ln[a-z0-9]{20,7000}$/i.test(pr)) {
    return Response.json({ error: "invoice_failed" }, { status: 502 });
  }

  // No caching — every invoice is single-use.
  return Response.json(
    { pr },
    { headers: { "Cache-Control": "no-store" } }
  );
}

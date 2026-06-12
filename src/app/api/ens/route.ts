import type { NextRequest } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// Resolves an ENS name to its address at pay time, so the payer sees (and
// the QR encodes) the actual 0x address behind "namn.eth". Read-only lookup
// against a public mainnet RPC — no keys, no funds involved.

const NAME_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.eth$/;

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export async function GET(request: NextRequest) {
  // Same-origin only — exists for our own /k pages, not as a public resolver.
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") ?? "").trim().toLowerCase();
  if (!NAME_RE.test(name) || name.length > 255) {
    return Response.json({ error: "bad_name" }, { status: 400 });
  }

  try {
    const address = await client.getEnsAddress({ name: normalize(name) });
    if (!address) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json(
      { address },
      // Short cache: ENS records can be re-pointed; pay-time should be fresh.
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return Response.json({ error: "ens_unavailable" }, { status: 502 });
  }
}

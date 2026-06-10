"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { track } from "@vercel/analytics/server";
import { createClient } from "@/lib/supabase/server";

export type CreateState = { error: string } | null;

export async function createSplitAction(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const title = String(formData.get("title") ?? "").trim();
  const currency = String(formData.get("currency") ?? "SEK");
  const names = formData
    .getAll("name")
    .map((n) => String(n).trim())
    .filter((n) => n.length > 0);

  // Errors are returned as codes; the client translates them via dict.errors.
  if (!title) return { error: "title_required" };
  if (names.length < 2) return { error: "need_two_participants" };

  // Hashed client IP feeds the per-IP creation throttle in the database.
  // Use Vercel's trusted headers — a client can spoof x-forwarded-for, but
  // x-vercel-forwarded-for / x-real-ip are set by the edge to the real
  // client IP and can't be overridden from the request.
  const headerStore = await headers();
  const ip =
    headerStore.get("x-vercel-forwarded-for")?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "";
  const ipHash = ip
    ? createHash("sha256").update(`tollysplit:${ip}`).digest("hex").slice(0, 32)
    : null;

  const supabase = await createClient();
  const { data: key, error } = await supabase.rpc("create_split", {
    p_title: title,
    p_currency: currency,
    p_names: names,
    p_ip_hash: ipHash,
  });

  if (error || !key) {
    if (error?.message.includes("rate_limited")) return { error: "rate_limited" };
    return { error: "unknown" };
  }

  await track("split_created", { participants: names.length, currency });
  redirect(`/k/${key}`);
}

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
  // Pair names with their (optional, invite-mode) emails by row index before
  // dropping empty rows, so the alignment survives into create_split.
  const rawNames = formData.getAll("name").map((n) => String(n).trim());
  const rawEmails = formData.getAll("email").map((e) => String(e).trim());
  const rows = rawNames
    .map((name, i) => ({ name, email: rawEmails[i] ?? "" }))
    .filter((r) => r.name.length > 0);
  const names = rows.map((r) => r.name);

  const secure = formData.get("secure") === "on";
  const accessMode = String(formData.get("access_mode") ?? "payers");
  const visibility = String(formData.get("visibility") ?? "link");
  const claimMode = String(formData.get("claim_mode") ?? "self");
  const emails =
    secure && claimMode === "invite" ? rows.map((r) => r.email) : null;

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

  // Secure splits require a logged-in creator.
  if (secure) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "login_required" };
  }

  const { data: key, error } = await supabase.rpc("create_split", {
    p_title: title,
    p_currency: currency,
    p_names: names,
    p_ip_hash: ipHash,
    p_secure: secure,
    p_access_mode: accessMode,
    p_visibility: visibility,
    p_claim_mode: claimMode,
    p_emails: emails,
  });

  if (error || !key) {
    if (error?.message.includes("rate_limited")) return { error: "rate_limited" };
    if (error?.message.includes("login_required")) return { error: "login_required" };
    return { error: "unknown" };
  }

  await track("split_created", { participants: names.length, currency });
  redirect(`/k/${key}`);
}

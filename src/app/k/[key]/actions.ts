"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { balances } from "@/lib/money";
import type { SplitData } from "@/lib/types";

// On failure, `error` is a stable code (see dict.errors) the client translates.
export type ActionResult = { ok: true } | { ok: false; error: string };

const ERROR_CODES = [
  "split_not_found",
  "participant_has_entries",
  "participant_not_found",
  "entry_not_found",
  "name_required",
  "bad_amount",
  "shares_required",
  "bad_recipient",
  "bad_payment_type",
  "bad_payment_value",
  "too_many_methods",
];

function errorCode(message: string | undefined): string {
  return ERROR_CODES.find((code) => message?.includes(code)) ?? "unknown";
}

async function rpc(
  key: string,
  fn: string,
  args: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: errorCode(error.message) };
  revalidatePath(`/k/${key}`);
  return { ok: true };
}

export type EntryInput = {
  id?: string;
  kind: "expense" | "transfer";
  description?: string;
  amount_cents: number;
  paid_by: string;
  transfer_to?: string;
  entry_date: string;
  orig_currency?: string;
  orig_amount_cents?: number;
  fx_rate?: number;
  shares: { participant_id: string; weight?: number; amount_cents?: number }[];
};

export async function saveEntryAction(
  key: string,
  entry: EntryInput
): Promise<ActionResult> {
  const result = await rpc(key, "save_entry", { p_key: key, p_entry: entry });

  // Privacy: once a transfer makes everyone square, stored payment methods
  // have served their purpose — wipe them.
  if (result.ok && entry.kind === "transfer") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("split_data", { p_key: key });
    const split = data as (SplitData & { not_found?: boolean }) | null;
    // Skip the wipe when the split opted to keep payment info (long-running splits).
    if (
      split &&
      !split.not_found &&
      split.participants &&
      !split.split?.keep_payment_methods
    ) {
      const hasMethods = split.participants.some(
        (p) => p.payment_methods?.length > 0
      );
      const allSquare = [...balances(split.participants, split.entries).values()].every(
        (v) => v === 0
      );
      if (hasMethods && allSquare) {
        await supabase.rpc("clear_payment_methods", { p_key: key });
        revalidatePath(`/k/${key}`);
      }
    }
  }
  return result;
}

export async function setAutoPurgeAction(
  key: string,
  on: boolean
): Promise<ActionResult> {
  return rpc(key, "set_auto_purge", { p_key: key, p_on: on });
}

export async function setKeepPaymentAction(
  key: string,
  on: boolean
): Promise<ActionResult> {
  return rpc(key, "set_keep_payment", { p_key: key, p_on: on });
}

export async function deleteEntryAction(
  key: string,
  entryId: string
): Promise<ActionResult> {
  return rpc(key, "delete_entry", { p_key: key, p_id: entryId });
}

export async function addParticipantAction(
  key: string,
  name: string
): Promise<ActionResult> {
  return rpc(key, "add_participant", { p_key: key, p_name: name });
}

export async function renameParticipantAction(
  key: string,
  participantId: string,
  name: string
): Promise<ActionResult> {
  return rpc(key, "rename_participant", {
    p_key: key,
    p_id: participantId,
    p_name: name,
  });
}

export async function deleteParticipantAction(
  key: string,
  participantId: string
): Promise<ActionResult> {
  return rpc(key, "delete_participant", { p_key: key, p_id: participantId });
}

export async function setPaymentMethodsAction(
  key: string,
  participantId: string,
  methods: { type: string; value: string }[]
): Promise<ActionResult> {
  return rpc(key, "set_payment_methods", {
    p_key: key,
    p_id: participantId,
    p_methods: methods,
  });
}

export async function updateSplitAction(
  key: string,
  title: string,
  currency: string
): Promise<ActionResult> {
  return rpc(key, "update_split", {
    p_key: key,
    p_title: title,
    p_currency: currency,
  });
}

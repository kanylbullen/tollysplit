"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  kitty_not_found: "Den här tollespliten finns inte längre.",
  participant_has_entries:
    "Deltagaren har utgifter eller överföringar och kan inte tas bort.",
  participant_not_found: "Deltagaren hittades inte.",
  entry_not_found: "Posten hittades inte.",
  name_required: "Namnet får inte vara tomt.",
  bad_amount: "Beloppet måste vara större än noll.",
  shares_required: "Minst en person måste vara med och dela.",
  bad_recipient: "Välj en annan mottagare än avsändaren.",
};

function friendly(message: string | undefined): string {
  for (const [code, text] of Object.entries(ERROR_MESSAGES)) {
    if (message?.includes(code)) return text;
  }
  return `Något gick fel: ${message ?? "okänt fel"}`;
}

async function rpc(
  key: string,
  fn: string,
  args: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: friendly(error.message) };
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
  shares: { participant_id: string; weight?: number; amount_cents?: number }[];
};

export async function saveEntryAction(
  key: string,
  entry: EntryInput
): Promise<ActionResult> {
  return rpc(key, "save_entry", { p_key: key, p_entry: entry });
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

export async function updateKittyAction(
  key: string,
  title: string,
  currency: string
): Promise<ActionResult> {
  return rpc(key, "update_kitty", {
    p_key: key,
    p_title: title,
    p_currency: currency,
  });
}

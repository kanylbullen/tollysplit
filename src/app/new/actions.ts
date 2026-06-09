"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateState = { error: string } | null;

export async function createKittyAction(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  const title = String(formData.get("title") ?? "").trim();
  const currency = String(formData.get("currency") ?? "SEK");
  const names = formData
    .getAll("name")
    .map((n) => String(n).trim())
    .filter((n) => n.length > 0);

  if (!title) return { error: "Ge din tollesplit ett namn." };
  if (names.length < 2) return { error: "Lägg till minst två deltagare." };

  const supabase = await createClient();
  const { data: key, error } = await supabase.rpc("create_kitty", {
    p_title: title,
    p_currency: currency,
    p_names: names,
  });

  if (error || !key) {
    if (error?.message.includes("not_allowed")) {
      return { error: "Ditt konto har inte behörighet att skapa tollesplits." };
    }
    return { error: `Något gick fel: ${error?.message ?? "okänt fel"}` };
  }

  redirect(`/k/${key}`);
}

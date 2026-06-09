import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { KittyData } from "@/lib/types";
import { KittyApp } from "@/components/kitty/KittyApp";

async function fetchKitty(key: string): Promise<KittyData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kitty_data", { p_key: key });
  if (error || !data) return null;
  return data as KittyData;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const data = await fetchKitty(key);
  return {
    title: data ? `${data.kitty.title} — Tollesplit` : "Tollesplit",
    robots: { index: false },
  };
}

export default async function KittyPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const data = await fetchKitty(key);
  if (!data) notFound();

  return <KittyApp data={data} />;
}

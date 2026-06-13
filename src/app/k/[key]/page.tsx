import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { SplitData } from "@/lib/types";
import { SplitApp } from "@/components/split/SplitApp";
import { MembersOnly } from "@/components/split/MembersOnly";

type Fetched = SplitData | "forbidden" | null;

async function fetchSplit(key: string): Promise<Fetched> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("split_data", { p_key: key });
  // A members-only secure split returns { forbidden: true } to non-members.
  if (data && (data as { forbidden?: boolean }).forbidden) return "forbidden";
  // Tolerate both behaviours: the old split_data raised (→ error) on an
  // unknown key; the new one returns { not_found: true } so it can log the
  // failed lookup for enumeration monitoring.
  if (error || !data || (data as { not_found?: boolean }).not_found) return null;
  return data as SplitData;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const data = await fetchSplit(key);
  // Keep the split out of search engines, but give link-unfurlers a clean,
  // generic English card (the OG image is inherited from the app root).
  const inviteDescription =
    "You've been invited to split shared expenses on Tollysplit. Open the link to add what you paid and see who owes what.";
  return {
    title:
      data && data !== "forbidden"
        ? `${data.split.title} — Tollysplit`
        : "Tollysplit",
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Tollysplit",
      title: "You've been invited to a Tollysplit",
      description: inviteDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: "You've been invited to a Tollysplit",
      description: inviteDescription,
    },
  };
}

export default async function SplitPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const data = await fetchSplit(key);
  if (data === "forbidden") return <MembersOnly splitKey={key} />;
  if (!data) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SplitApp data={data} loggedIn={Boolean(user)} />;
}

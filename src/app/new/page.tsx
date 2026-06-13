import Link from "next/link";
import { NewSplitForm } from "./NewSplitForm";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function NewSplitPage() {
  const { dict } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <Link
        href="/"
        className="mb-10 text-xl font-black tracking-tight text-primary"
      >
        tollysplit
      </Link>
      <h1 className="mb-2 text-2xl font-black tracking-tight">
        {dict.new.title}
      </h1>
      <p className="mb-6 text-stone-500">{dict.new.subtitle}</p>
      <NewSplitForm loggedIn={Boolean(user)} />
    </main>
  );
}

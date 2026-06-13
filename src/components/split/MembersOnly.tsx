import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

// Shown when a members-only secure split is opened by someone who isn't the
// creator or a claimed member. If they're logged in, they simply aren't a
// member; if not, they need to sign in (with the invited account).
export async function MembersOnly({ splitKey }: { splitKey: string }) {
  const { dict } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-16 text-center">
      <Link href="/" className="mb-10 text-xl font-black tracking-tight text-primary">
        tollysplit
      </Link>
      <div className="text-4xl">🔒</div>
      <h1 className="mt-3 text-2xl font-black tracking-tight">
        {dict.members.title}
      </h1>
      <p className="mt-2 text-stone-500">
        {user ? dict.members.notMember : dict.members.signInPrompt}
      </p>
      {!user && (
        <Link
          href={`/login?next=/k/${splitKey}`}
          className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          {dict.nav.login}
        </Link>
      )}
    </main>
  );
}

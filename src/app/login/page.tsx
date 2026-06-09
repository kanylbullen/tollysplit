import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <Link
        href="/"
        className="mb-10 text-xl font-black tracking-tight text-primary"
      >
        tollesplit
      </Link>
      <h1 className="mb-2 text-2xl font-black tracking-tight">Logga in</h1>
      <p className="mb-6 text-stone-500">
        Ange din e-postadress så skickar vi en inloggningslänk.
      </p>
      {error === "invalid_link" && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Länken är ogiltig eller har gått ut. Prova att logga in igen.
        </p>
      )}
      <LoginForm />
    </main>
  );
}

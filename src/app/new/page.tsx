import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewKittyForm } from "./NewKittyForm";

export default async function NewKittyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: canCreate } = await supabase.rpc("can_create");
  if (canCreate !== true) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <Link
        href="/"
        className="mb-10 text-xl font-black tracking-tight text-primary"
      >
        tollesplit
      </Link>
      <h1 className="mb-2 text-2xl font-black tracking-tight">
        Ny tollesplit
      </h1>
      <p className="mb-6 text-stone-500">
        Döp den efter resan eller tillfället och lägg till alla som ska dela på
        kostnaderna.
      </p>
      <NewKittyForm />
    </main>
  );
}

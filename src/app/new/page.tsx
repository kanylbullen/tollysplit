import Link from "next/link";
import { NewKittyForm } from "./NewKittyForm";

export default function NewKittyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <Link
        href="/"
        className="mb-10 text-xl font-black tracking-tight text-primary"
      >
        tollysplit
      </Link>
      <h1 className="mb-2 text-2xl font-black tracking-tight">
        Ny tollysplit
      </h1>
      <p className="mb-6 text-stone-500">
        Döp den efter resan eller tillfället och lägg till alla som ska dela på
        kostnaderna. Ingen inloggning behövs — men spara länken när du är
        klar, den är nyckeln till din tollysplit.
      </p>
      <NewKittyForm />
    </main>
  );
}

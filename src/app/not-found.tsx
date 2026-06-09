import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="mb-2 text-5xl">🫥</p>
      <h1 className="mb-2 text-2xl font-black tracking-tight">
        Hittar inget här
      </h1>
      <p className="mb-6 text-stone-500">
        Länken är fel eller så har den här tollespliten tagits bort. Kolla att
        du fått hela länken.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-primary px-5 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
      >
        Till startsidan
      </Link>
    </main>
  );
}

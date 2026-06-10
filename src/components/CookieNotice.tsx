"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const STORAGE_KEY = "tollysplit:cookie-ok";

export function CookieNotice() {
  const { dict } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-stone-200/80 bg-surface px-4 py-3 text-sm shadow-lg">
      <span className="text-base">🍪</span>
      <p className="min-w-0 flex-1 text-stone-500">
        {dict.cookie.notice}{" "}
        <Link
          href="/cookies"
          className="whitespace-nowrap text-primary hover:text-primary-dark"
        >
          {dict.cookie.readMore}
        </Link>
      </p>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        className="rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        {dict.cookie.ok}
      </button>
    </div>
  );
}

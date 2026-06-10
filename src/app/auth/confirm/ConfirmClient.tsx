"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

/**
 * Email scanners (e.g. Microsoft Safe Links) prefetch links in emails, which
 * would consume a one-time login token before the user clicks. That's why the
 * token_hash flow requires an explicit button press — scanners follow links
 * but don't click buttons.
 */
export function ConfirmClient({
  tokenHash,
  type,
  code,
  next,
}: {
  tokenHash: string | null;
  type: string;
  code: string | null;
  next: string;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only allow same-site internal redirects — never a protocol-relative
  // (//evil.com) or absolute URL smuggled in via the ?next= param.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // A ?code= param comes from Supabase's own redirect after it already
  // verified the token — nothing left to protect, exchange right away.
  useEffect(() => {
    if (!code) return;
    (async () => {
      const { error } = await createClient().auth.exchangeCodeForSession(code);
      if (error) setError(dict.confirm.invalid);
      else {
        router.push(safeNext);
        router.refresh();
      }
    })();
  }, [code, safeNext, router]);

  async function confirm() {
    if (!tokenHash) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      setBusy(false);
      setError(dict.confirm.invalid);
      return;
    }
    router.push(safeNext);
    router.refresh();
  }

  const invalid = !tokenHash && !code;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="mb-8 text-xl font-black tracking-tight text-primary">
        tollysplit
      </span>
      {error || invalid ? (
        <>
          <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? dict.confirm.invalid} {dict.confirm.invalidMore}
          </p>
          <Button onClick={() => router.push("/login")}>
            {dict.confirm.toLogin}
          </Button>
        </>
      ) : code ? (
        <p className="text-stone-500">{dict.confirm.loggingIn}</p>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-black tracking-tight">
            {dict.confirm.heading}
          </h1>
          <p className="mb-6 text-stone-500">{dict.confirm.body}</p>
          <Button onClick={confirm} disabled={busy} className="px-8">
            {busy ? dict.confirm.loggingIn : dict.confirm.login}
          </Button>
        </>
      )}
    </main>
  );
}

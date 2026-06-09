"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("rate limit") ||
          error.status === 429
          ? "För många försök just nu — vänta en stund och prova igen."
          : `Kunde inte skicka mejlet: ${error.message}`
      );
      return;
    }
    setStep("verify");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError("Fel kod, eller så har den gått ut. Prova igen.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (step === "verify") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="rounded-xl bg-primary-soft/60 px-4 py-3 text-sm text-primary-dark">
          Mejl skickat till <strong>{email}</strong>. Klicka på länken i
          mejlet, eller ange engångskoden här.
        </p>
        <div>
          <Label htmlFor="code">Engångskod</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <Button type="submit" disabled={busy || code.trim().length < 6} className="w-full">
          {busy ? "Verifierar…" : "Logga in"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="w-full text-sm text-stone-500 hover:text-ink"
        >
          Använd en annan adress
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div>
        <Label htmlFor="email">E-postadress</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="din@mejl.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Skickar…" : "Skicka inloggningslänk"}
      </Button>
    </form>
  );
}

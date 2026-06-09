"use client";

import { useEffect, useRef } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-primary text-white hover:bg-primary-dark shadow-sm disabled:opacity-50",
    secondary:
      "bg-white text-ink border border-stone-300 hover:bg-stone-50 disabled:opacity-50",
    ghost: "text-primary hover:bg-primary-soft/60 disabled:opacity-50",
    danger: "text-negative hover:bg-red-50 disabled:opacity-50",
  } as const;
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base outline-none transition-colors placeholder:text-stone-400 focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-stone-600 ${className}`}
      {...props}
    />
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Stäng"
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

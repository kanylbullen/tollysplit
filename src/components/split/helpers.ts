import type { Participant } from "@/lib/types";

const AVATAR_COLORS = [
  "bg-teal-600",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-cyan-600",
  "bg-fuchsia-500",
];

export function avatarColor(participant: Participant): string {
  return AVATAR_COLORS[participant.position % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatDateHeading(
  isoDate: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string
): string {
  const today = new Date();
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (isoDate === toIso(today)) return todayLabel;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isoDate === toIso(yesterday)) return yesterdayLabel;

  const date = new Date(`${isoDate}T00:00:00`);
  const sameYear = date.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

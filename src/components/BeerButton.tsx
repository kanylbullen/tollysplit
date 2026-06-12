"use client";

import { track } from "@vercel/analytics";

export function BeerButton() {
  return (
    <a
      href="https://buymeacoffee.com/xuperfun"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("beer_clicked", { location: "footer" })}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-primary-dark"
    >
      <span className="text-base">🍺</span> Buy me a beer
    </a>
  );
}

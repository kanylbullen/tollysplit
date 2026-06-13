"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/lib/wallet/config";

const queryClient = new QueryClient();

// Initialise AppKit once on the client (only when configured).
if (wagmiAdapter && projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: "Tollysplit",
      description: "Split shared expenses",
      url: "https://tollysplit.xuper.fun",
      icons: ["https://tollysplit.xuper.fun/icon.svg"],
    },
    features: { analytics: false, email: false, socials: false },
    // Match the app: Geist (the same --font-geist-sans set on <html>) and our
    // teal accent. themeMode auto-follows the user's light/dark preference.
    themeVariables: {
      "--w3m-font-family": "var(--font-geist-sans), system-ui, sans-serif",
      "--w3m-accent": "#14b8a6",
    },
  });
}

/** Wraps children in wagmi/AppKit context — passthrough when not configured. */
export function WalletProvider({ children }: { children: ReactNode }) {
  if (!wagmiAdapter) return <>{children}</>;
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

/** True when the WalletConnect flow is available (project id configured). */
export const walletEnabled = Boolean(projectId);

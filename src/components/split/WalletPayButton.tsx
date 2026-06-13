"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { useAppKit } from "@reown/appkit/react";
import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  EVM_CHAINS,
  ERC20_TRANSFER_ABI,
  usdToUsdcUnits,
  type EvmChainKey,
} from "@/lib/wallet/usdc";
import { useI18n } from "@/lib/i18n/client";

// One-tap prefilled USDC payment over WalletConnect. We know the recipient
// (resolved 0x) and the debt in USD, so we build the exact ERC-20 transfer and
// the payer just approves it in their wallet. Funds never touch us.
export function WalletPayButton({
  toAddress,
  usd,
}: {
  toAddress: string;
  usd: number | null;
}) {
  const { dict, t } = useI18n();
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [chainKey, setChainKey] = useState<EvmChainKey>("base");
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const chain = EVM_CHAINS.find((c) => c.key === chainKey)!;
  const usdcLabel = usd !== null ? usd.toFixed(2) : null;

  async function pay() {
    if (usd === null) return;
    setError(null);
    setBusy(true);
    try {
      if (chainId !== chain.id) {
        await switchChainAsync({ chainId: chain.id });
      }
      const tx = await writeContractAsync({
        address: chain.usdc,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [toAddress as `0x${string}`, usdToUsdcUnits(usd)],
        chainId: chain.id,
      });
      setHash(tx);
      track("wallet_pay_sent", { chain: chain.key });
    } catch (e) {
      // User rejection or wallet error — keep it short, details are in console.
      setError(dict.pay.walletError);
      if (e instanceof Error && process.env.NODE_ENV !== "production") {
        console.error(e);
      }
    } finally {
      setBusy(false);
    }
  }

  if (isSuccess) {
    return (
      <p className="w-full rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-positive">
        {dict.pay.walletSent}
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-stone-500">{dict.pay.walletChain}</label>
        <select
          value={chainKey}
          onChange={(e) => setChainKey(e.target.value as EvmChainKey)}
          disabled={busy || confirming}
          className="flex-1 rounded-lg border border-stone-300 bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
        >
          {EVM_CHAINS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {!isConnected ? (
        <button
          onClick={() => open()}
          className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          {dict.pay.walletConnect}
        </button>
      ) : (
        <>
          <button
            onClick={pay}
            disabled={busy || confirming || usd === null}
            className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {confirming
              ? dict.pay.walletConfirming
              : busy
                ? dict.pay.walletAwaiting
                : usdcLabel
                  ? t(dict.pay.walletPay, { amount: usdcLabel })
                  : dict.pay.walletPayGeneric}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
            {address && (
              <span className="font-mono">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            )}
            <span>·</span>
            <button
              onClick={() => disconnect()}
              disabled={busy || confirming}
              className="font-semibold text-stone-500 underline hover:text-primary-dark disabled:opacity-50"
            >
              {dict.pay.walletDisconnect}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-center text-sm text-negative">{error}</p>}
    </div>
  );
}

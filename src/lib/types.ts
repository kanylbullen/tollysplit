import type { PaymentType } from "./payment";

export type PaymentMethod = {
  type: PaymentType;
  value: string;
};

export type Participant = {
  id: string;
  name: string;
  position: number;
  payment_methods: PaymentMethod[];
};

export type Share = {
  participant_id: string;
  weight: number;
  amount_cents: number | null;
};

export type EntryKind = "expense" | "transfer";

export type Entry = {
  id: string;
  kind: EntryKind;
  description: string | null;
  amount_cents: number;
  paid_by: string;
  transfer_to: string | null;
  entry_date: string;
  created_at: string;
  /** Foreign-currency origin (null = entered in the split's main currency). */
  orig_currency: string | null;
  orig_amount_cents: number | null;
  fx_rate: number | null;
  shares: Share[];
};

export type Split = {
  key: string;
  title: string;
  currency: string;
  created_at: string;
  has_owner: boolean;
  auto_purge: boolean;
};

export type SplitData = {
  split: Split;
  participants: Participant[];
  entries: Entry[];
};

export type SplitSummary = {
  key: string;
  title: string;
  currency: string;
  created_at: string;
  participant_count: number;
  entry_count: number;
};

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
  /** Set if the payment details ever diverged from what was first entered. */
  payment_changed_at: string | null;
  /** Secure splits: whether this slot is bound to a user, and to me. */
  claimed: boolean;
  is_me: boolean;
  /** Secure invite-mode: this slot has a reserved email. */
  has_invite: boolean;
  /** Set when this participant first opened the split. */
  seen_at: string | null;
  /** Set when this participant marked themselves done adding expenses. */
  ready_at: string | null;
};

export type AccessMode = "all" | "payers";
export type Visibility = "link" | "members";
export type ClaimMode = "self" | "invite";

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
  /** When true, payment info is NOT wiped once everyone is square. */
  keep_payment_methods: boolean;
  /** Secure split: identity-based access on top of the link capability. */
  secure: boolean;
  access_mode: AccessMode;
  visibility: Visibility;
  claim_mode: ClaimMode;
  /** True when the current viewer created this split. */
  is_creator: boolean;
  /** The viewer's claimed participant id, or null. */
  me_participant: string | null;
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

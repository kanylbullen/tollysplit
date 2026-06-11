-- Tollysplit — consolidated baseline schema
-- Reflects the production database as of
-- 2026-06-10. The schema was originally applied piecemeal via the Supabase
-- MCP; this file makes it version-controlled and reviewable.
--
-- Security model:
--   * All app access goes through SECURITY DEFINER RPCs below. The secret
--     32-char split `key` (from gen_random_uuid) is the capability.
--   * RLS is enabled with NO policies (deny-all) on every table, AND the
--     default anon/authenticated table GRANTs are revoked — direct PostgREST
--     table access is doubly blocked. The RPCs run as owner and bypass both.
--   * Every SECURITY DEFINER function pins search_path. Internal helpers
--     (_require_split, _touch_split) are executable only by postgres/
--     service_role, never anon/authenticated.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.splits (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  currency text not null default 'SEK',
  created_by uuid,
  created_at timestamptz not null default now(),
  created_ip_hash text,
  last_activity timestamptz not null default now(),
  auto_purge boolean not null default true
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  payment_type text check (payment_type in ('swish', 'vipps', 'mobilepay', 'iban')),
  payment_value text
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  kind text not null check (kind in ('expense', 'transfer')),
  description text,
  amount_cents bigint not null check (amount_cents > 0),
  paid_by uuid not null references public.participants(id),
  transfer_to uuid references public.participants(id),
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Opt-in multi-currency: amount_cents is always in the split's main currency;
  -- these record the original foreign-currency entry and the locked FX rate.
  orig_currency text,
  orig_amount_cents bigint check (orig_amount_cents is null or orig_amount_cents > 0),
  fx_rate numeric check (fx_rate is null or fx_rate > 0),
  constraint transfer_has_recipient check (
    (kind = 'transfer' and transfer_to is not null) or
    (kind = 'expense' and transfer_to is null)
  )
);

create table if not exists public.entry_shares (
  entry_id uuid not null references public.entries(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  weight numeric not null default 1 check (weight > 0),
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  primary key (entry_id, participant_id)
);

create index if not exists entries_split_idx on public.entries (split_id, entry_date desc, created_at desc);
create index if not exists participants_split_idx on public.participants (split_id, position);
create index if not exists splits_created_at_idx on public.splits (created_at);
create index if not exists splits_ip_hash_idx on public.splits (created_ip_hash, created_at);
create index if not exists splits_purge_idx on public.splits (last_activity) where auto_purge;

-- ─────────────────────────────────────────────────────────────────────────
-- Row level security: deny-all + revoke direct table grants
-- ─────────────────────────────────────────────────────────────────────────

alter table public.splits enable row level security;
alter table public.participants enable row level security;
alter table public.entries enable row level security;
alter table public.entry_shares enable row level security;

revoke all on public.splits from anon, authenticated;
revoke all on public.participants from anon, authenticated;
revoke all on public.entries from anon, authenticated;
revoke all on public.entry_shares from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Internal helpers (NOT granted to anon/authenticated)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public._require_split(p_key text)
returns uuid
language plpgsql stable security definer set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from splits where key = p_key;
  if v_id is null then
    raise exception 'split_not_found' using errcode = 'P0002';
  end if;
  return v_id;
end $$;

create or replace function public._touch_split(p_id uuid)
returns void
language sql volatile security definer set search_path = public
as $$
  update splits set last_activity = now() where id = p_id;
$$;

revoke execute on function public._require_split(text) from public, anon, authenticated;
revoke execute on function public._touch_split(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Public RPC API (the only surface anon/authenticated may call)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.can_create()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
$$;

create or replace function public.create_split(
  p_title text,
  p_currency text,
  p_names text[],
  p_ip_hash text default null
)
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_key text;
  v_id uuid;
  v_name text;
  v_pos int := 0;
begin
  if (select count(*) from splits where created_at > now() - interval '1 hour') >= 2000 then
    raise exception 'rate_limited';
  end if;
  if p_ip_hash is not null and (
    select count(*) from splits
    where created_ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'title_required';
  end if;
  if p_names is null or array_length(p_names, 1) < 2 then
    raise exception 'need_two_participants';
  end if;

  v_key := replace(gen_random_uuid()::text, '-', '');
  insert into splits (key, title, currency, created_by, created_ip_hash)
  values (
    v_key,
    trim(p_title),
    coalesce(nullif(trim(p_currency), ''), 'SEK'),
    auth.uid(),
    p_ip_hash
  )
  returning id into v_id;

  foreach v_name in array p_names loop
    if length(trim(v_name)) > 0 then
      insert into participants (split_id, name, position) values (v_id, trim(v_name), v_pos);
      v_pos := v_pos + 1;
    end if;
  end loop;
  return v_key;
end $$;

create or replace function public.my_splits()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', k.key, 'title', k.title, 'currency', k.currency, 'created_at', k.created_at,
    'participant_count', (select count(*) from participants p where p.split_id = k.id),
    'entry_count', (select count(*) from entries e where e.split_id = k.id)
  ) order by k.created_at desc), '[]'::jsonb)
  from splits k where k.created_by = auth.uid()
$$;

create or replace function public.split_data(p_key text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update splits set last_activity = now()
  where id = v_id and last_activity < now() - interval '1 day';

  return jsonb_build_object(
    'split', (select jsonb_build_object(
        'key', k.key, 'title', k.title, 'currency', k.currency, 'created_at', k.created_at,
        'has_owner', k.created_by is not null, 'auto_purge', k.auto_purge
      ) from splits k where k.id = v_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'position', p.position,
        'payment_type', p.payment_type, 'payment_value', p.payment_value
      ) order by p.position, p.created_at), '[]'::jsonb)
      from participants p where p.split_id = v_id),
    'entries', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'kind', e.kind, 'description', e.description,
        'amount_cents', e.amount_cents, 'paid_by', e.paid_by,
        'transfer_to', e.transfer_to, 'entry_date', e.entry_date,
        'created_at', e.created_at,
        'orig_currency', e.orig_currency, 'orig_amount_cents', e.orig_amount_cents, 'fx_rate', e.fx_rate,
        'shares', (select coalesce(jsonb_agg(jsonb_build_object(
            'participant_id', s.participant_id, 'weight', s.weight, 'amount_cents', s.amount_cents
          )), '[]'::jsonb) from entry_shares s where s.entry_id = e.id)
      ) order by e.entry_date desc, e.created_at desc), '[]'::jsonb)
      from entries e where e.split_id = v_id)
  );
end $$;

create or replace function public.update_split(p_key text, p_title text, p_currency text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update splits set
    title = coalesce(nullif(trim(p_title), ''), title),
    currency = coalesce(nullif(trim(p_currency), ''), currency),
    last_activity = now()
  where id = v_id;
end $$;

create or replace function public.add_participant(p_key text, p_name text)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid := _require_split(p_key);
  v_pid uuid;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'name_required';
  end if;
  insert into participants (split_id, name, position)
  values (v_id, trim(p_name), (select coalesce(max(position), -1) + 1 from participants where split_id = v_id))
  returning id into v_pid;
  perform _touch_split(v_id);
  return v_pid;
end $$;

create or replace function public.rename_participant(p_key text, p_id uuid, p_name text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'name_required';
  end if;
  update participants set name = trim(p_name) where id = p_id and split_id = v_id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

create or replace function public.delete_participant(p_key text, p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  if exists (
    select 1 from entries e where e.split_id = v_id and (e.paid_by = p_id or e.transfer_to = p_id)
    union all
    select 1 from entry_shares s join entries e on e.id = s.entry_id
    where e.split_id = v_id and s.participant_id = p_id
  ) then
    raise exception 'participant_has_entries' using errcode = '23503';
  end if;
  delete from participants where id = p_id and split_id = v_id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

create or replace function public.set_payment_method(p_key text, p_id uuid, p_type text, p_value text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key); v_clean text;
begin
  if p_type is null or p_value is null or length(trim(p_value)) = 0 then
    update participants set payment_type = null, payment_value = null where id = p_id and split_id = v_id;
  else
    if p_type not in ('swish', 'vipps', 'mobilepay', 'iban') then raise exception 'bad_payment_type'; end if;
    if p_type = 'iban' then
      v_clean := upper(replace(p_value, ' ', ''));
      if v_clean !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$' then raise exception 'bad_payment_value'; end if;
    else
      v_clean := replace(replace(p_value, ' ', ''), '-', '');
      if v_clean !~ '^\+?[0-9]{6,15}$' then raise exception 'bad_payment_value'; end if;
    end if;
    update participants set payment_type = p_type, payment_value = v_clean where id = p_id and split_id = v_id;
  end if;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

create or replace function public.clear_payment_methods(p_key text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update participants set payment_type = null, payment_value = null
  where split_id = v_id and (payment_type is not null or payment_value is not null);
end $$;

create or replace function public.set_auto_purge(p_key text, p_on boolean)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update splits set auto_purge = p_on, last_activity = now() where id = v_id;
end $$;

create or replace function public.save_entry(p_key text, p_entry jsonb)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_split uuid := _require_split(p_key);
  v_id uuid := nullif(p_entry->>'id', '')::uuid;
  v_kind text := p_entry->>'kind';
  v_amount bigint := (p_entry->>'amount_cents')::bigint;
  v_paid_by uuid := (p_entry->>'paid_by')::uuid;
  v_transfer_to uuid := nullif(p_entry->>'transfer_to', '')::uuid;
  v_date date := coalesce(nullif(p_entry->>'entry_date', '')::date, current_date);
  v_desc text := nullif(trim(coalesce(p_entry->>'description', '')), '');
  v_orig_currency text := nullif(trim(coalesce(p_entry->>'orig_currency', '')), '');
  v_orig_amount bigint := nullif(p_entry->>'orig_amount_cents', '')::bigint;
  v_fx_rate numeric := nullif(p_entry->>'fx_rate', '')::numeric;
  v_share jsonb;
  v_share_count int := 0;
begin
  if v_kind not in ('expense', 'transfer') then raise exception 'bad_kind'; end if;
  if v_amount is null or v_amount <= 0 then raise exception 'bad_amount'; end if;
  if not exists (select 1 from participants where id = v_paid_by and split_id = v_split) then
    raise exception 'bad_payer';
  end if;
  if v_orig_currency is not null and (v_orig_amount is null or v_fx_rate is null) then
    raise exception 'bad_currency';
  end if;
  if v_kind = 'transfer' then
    v_orig_currency := null; v_orig_amount := null; v_fx_rate := null;
    if v_transfer_to is null or v_transfer_to = v_paid_by
       or not exists (select 1 from participants where id = v_transfer_to and split_id = v_split) then
      raise exception 'bad_recipient';
    end if;
  else
    v_transfer_to := null;
    select count(*) into v_share_count from jsonb_array_elements(coalesce(p_entry->'shares', '[]'::jsonb));
    if v_share_count = 0 then raise exception 'shares_required'; end if;
  end if;

  if v_id is not null then
    update entries set kind = v_kind, description = v_desc, amount_cents = v_amount,
      paid_by = v_paid_by, transfer_to = v_transfer_to, entry_date = v_date,
      orig_currency = v_orig_currency, orig_amount_cents = v_orig_amount, fx_rate = v_fx_rate,
      updated_at = now()
    where id = v_id and split_id = v_split;
    if not found then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
    delete from entry_shares where entry_id = v_id;
  else
    insert into entries (split_id, kind, description, amount_cents, paid_by, transfer_to, entry_date,
      orig_currency, orig_amount_cents, fx_rate)
    values (v_split, v_kind, v_desc, v_amount, v_paid_by, v_transfer_to, v_date,
      v_orig_currency, v_orig_amount, v_fx_rate)
    returning id into v_id;
  end if;

  if v_kind = 'expense' then
    for v_share in select * from jsonb_array_elements(p_entry->'shares') loop
      if not exists (select 1 from participants where id = (v_share->>'participant_id')::uuid and split_id = v_split) then
        raise exception 'bad_share_participant';
      end if;
      insert into entry_shares (entry_id, participant_id, weight, amount_cents)
      values (
        v_id,
        (v_share->>'participant_id')::uuid,
        coalesce(nullif(v_share->>'weight', '')::numeric, 1),
        nullif(v_share->>'amount_cents', '')::bigint
      );
    end loop;
  end if;
  perform _touch_split(v_split);
  return v_id;
end $$;

create or replace function public.delete_entry(p_key text, p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_split uuid := _require_split(p_key);
begin
  delete from entries where id = p_id and split_id = v_split;
  if not found then
    raise exception 'entry_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_split);
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC grants: lock down, then grant only the public API surface
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public;

grant execute on function public.can_create() to authenticated;
grant execute on function public.my_splits() to authenticated;
grant execute on function public.create_split(text, text, text[], text) to anon, authenticated;
grant execute on function public.split_data(text) to anon, authenticated;
grant execute on function public.update_split(text, text, text) to anon, authenticated;
grant execute on function public.add_participant(text, text) to anon, authenticated;
grant execute on function public.rename_participant(text, uuid, text) to anon, authenticated;
grant execute on function public.delete_participant(text, uuid) to anon, authenticated;
grant execute on function public.set_payment_method(text, uuid, text, text) to anon, authenticated;
grant execute on function public.clear_payment_methods(text) to anon, authenticated;
grant execute on function public.set_auto_purge(text, boolean) to anon, authenticated;
grant execute on function public.save_entry(text, jsonb) to anon, authenticated;
grant execute on function public.delete_entry(text, uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Scheduled privacy purge (pg_cron)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;

select cron.schedule(
  'tollysplit-privacy-purge',
  '42 3 * * *',
  $job$
  delete from public.splits
    where auto_purge and last_activity < now() - interval '6 months';
  update public.splits set created_ip_hash = null
    where created_ip_hash is not null and created_at < now() - interval '24 hours';
  $job$
);

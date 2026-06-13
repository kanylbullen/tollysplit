-- Secure splits: an identity layer on top of the secret-link capability.
--
-- A logged-in creator can mark a split "secure". Then:
--   * participants bind to an auth user by claiming a slot (claim_mode: 'self'
--     = pick any unclaimed name; 'invite' = only the invited email may claim);
--   * you can only edit YOUR OWN payment details, and only enter expenses where
--     you are the payer;
--   * access_mode 'payers' = only people with expenses must be members (enforced
--     by "paid_by must be you"); 'all' = everyone must claim before you can
--     settle up;
--   * visibility 'members' = only the creator and claimed members can read the
--     split; 'link' = anyone with the link can read, but still only edit their
--     own.
-- Non-secure splits are completely unchanged (the link stays the only key).

alter table splits add column if not exists secure boolean not null default false;
alter table splits add column if not exists access_mode text not null default 'payers'
  check (access_mode in ('all', 'payers'));
alter table splits add column if not exists visibility text not null default 'link'
  check (visibility in ('link', 'members'));
alter table splits add column if not exists claim_mode text not null default 'self'
  check (claim_mode in ('self', 'invite'));

alter table participants add column if not exists user_id uuid;
alter table participants add column if not exists invite_email text;
-- One slot per user per split.
create unique index if not exists participants_split_user_uq
  on participants (split_id, user_id) where user_id is not null;

-- The caller's claimed participant in a split (null if none / not logged in).
create or replace function public._caller_participant(p_split uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from participants
  where split_id = p_split and user_id = auth.uid()
  limit 1;
$$;

-- ── create_split: optional secure config (requires login when secure) ────────
-- Drop the old 4-arg signature so the new overload isn't ambiguous to PostgREST.
drop function if exists public.create_split(text, text, text[], text);

create or replace function public.create_split(
  p_title text,
  p_currency text,
  p_names text[],
  p_ip_hash text default null,
  p_secure boolean default false,
  p_access_mode text default 'payers',
  p_visibility text default 'link',
  p_claim_mode text default 'self',
  p_emails text[] default null
)
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_key text;
  v_id uuid;
  v_name text;
  v_pos int := 0;
  v_uid uuid := auth.uid();
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
  if p_secure then
    if v_uid is null then raise exception 'login_required'; end if;
    if p_access_mode not in ('all', 'payers') then raise exception 'bad_config'; end if;
    if p_visibility not in ('link', 'members') then raise exception 'bad_config'; end if;
    if p_claim_mode not in ('self', 'invite') then raise exception 'bad_config'; end if;
  end if;

  v_key := replace(gen_random_uuid()::text, '-', '');
  insert into splits (key, title, currency, created_by, created_ip_hash,
                      secure, access_mode, visibility, claim_mode)
  values (
    v_key, trim(p_title), coalesce(nullif(trim(p_currency), ''), 'SEK'), v_uid, p_ip_hash,
    coalesce(p_secure, false),
    case when p_secure then p_access_mode else 'payers' end,
    case when p_secure then p_visibility else 'link' end,
    case when p_secure then p_claim_mode else 'self' end
  )
  returning id into v_id;

  foreach v_name in array p_names loop
    if length(trim(v_name)) > 0 then
      insert into participants (split_id, name, position, invite_email)
      values (
        v_id, trim(v_name), v_pos,
        case
          when p_secure and p_claim_mode = 'invite'
               and p_emails is not null and array_length(p_emails, 1) >= v_pos + 1
            then nullif(lower(trim(p_emails[v_pos + 1])), '')
          else null
        end
      );
      v_pos := v_pos + 1;
    end if;
  end loop;
  return v_key;
end $$;

grant execute on function public.create_split(text, text, text[], text, boolean, text, text, text, text[]) to anon, authenticated;

-- ── claim / unclaim a participant slot ───────────────────────────────────────
create or replace function public.claim_participant(p_key text, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_split uuid := _require_split(p_key);
  v_secure boolean; v_mode text; v_invite text; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'login_required'; end if;
  select secure, claim_mode into v_secure, v_mode from splits where id = v_split;
  if not v_secure then raise exception 'not_secure'; end if;
  if exists (select 1 from participants where split_id = v_split and user_id = v_uid and id <> p_id) then
    raise exception 'already_claimed';
  end if;
  if v_mode = 'invite' then
    select lower(invite_email) into v_invite from participants where id = p_id and split_id = v_split;
    if v_invite is null or v_invite is distinct from lower(auth.jwt() ->> 'email') then
      raise exception 'not_invited';
    end if;
  end if;
  update participants set user_id = v_uid
    where id = p_id and split_id = v_split and (user_id is null or user_id = v_uid);
  if not found then raise exception 'slot_taken'; end if;
  perform _touch_split(v_split);
end $$;
grant execute on function public.claim_participant(text, uuid) to anon, authenticated;

create or replace function public.unclaim_participant(p_key text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_split uuid := _require_split(p_key);
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  update participants set user_id = null where split_id = v_split and user_id = auth.uid();
  perform _touch_split(v_split);
end $$;
grant execute on function public.unclaim_participant(text) to anon, authenticated;

-- ── set_payment_methods: in secure splits, only your own ─────────────────────
create or replace function public.set_payment_methods(p_key text, p_id uuid, p_methods jsonb)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid := _require_split(p_key);
  v_secure boolean;
  v_owner uuid;
  v_out jsonb := '[]'::jsonb;
  m jsonb; v_type text; v_raw text; v_clean text; v_count int := 0;
begin
  select secure into v_secure from splits where id = v_id;
  if v_secure then
    select user_id into v_owner from participants where id = p_id and split_id = v_id;
    if v_owner is null or v_owner is distinct from auth.uid() then
      raise exception 'not_your_participant';
    end if;
  end if;
  if p_methods is null or jsonb_typeof(p_methods) <> 'array' then
    raise exception 'bad_payment_value';
  end if;
  for m in select * from jsonb_array_elements(p_methods) loop
    v_count := v_count + 1;
    if v_count > 8 then raise exception 'too_many_methods'; end if;
    v_type := m->>'type';
    v_raw := coalesce(m->>'value', '');
    if v_type not in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut', 'lightning', 'evm') then raise exception 'bad_payment_type'; end if;
    if length(trim(v_raw)) = 0 then raise exception 'bad_payment_value'; end if;
    if v_type = 'iban' then
      v_clean := upper(replace(v_raw, ' ', ''));
      if v_clean !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$' then raise exception 'bad_payment_value'; end if;
    elsif v_type = 'revolut' then
      v_clean := lower(regexp_replace(trim(v_raw), '^@', ''));
      if v_clean !~ '^[a-z0-9]{4,30}$' then raise exception 'bad_payment_value'; end if;
    elsif v_type = 'lightning' then
      v_clean := lower(trim(v_raw));
      if v_clean !~ '^[a-z0-9._%+-]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' then raise exception 'bad_payment_value'; end if;
      if length(v_clean) > 320 then raise exception 'bad_payment_value'; end if;
    elsif v_type = 'evm' then
      v_clean := lower(trim(v_raw));
      if v_clean !~ '^0x[0-9a-f]{40}$'
        and v_clean !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.eth$' then
        raise exception 'bad_payment_value';
      end if;
      if length(v_clean) > 255 then raise exception 'bad_payment_value'; end if;
    else
      v_clean := replace(replace(v_raw, ' ', ''), '-', '');
      if v_clean !~ '^\+?[0-9]{6,15}$' then raise exception 'bad_payment_value'; end if;
    end if;
    v_out := v_out || jsonb_build_object('type', v_type, 'value', v_clean);
  end loop;
  update participants set
    payment_methods = v_out, payment_type = null, payment_value = null,
    payment_original = case when payment_original is null and v_out <> '[]'::jsonb then v_out else payment_original end,
    payment_changed_at = case when payment_original is not null and v_out <> '[]'::jsonb and v_out <> payment_original then now() else payment_changed_at end
    where id = p_id and split_id = v_id;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  perform _touch_split(v_id);
end $$;
grant execute on function public.set_payment_methods(text, uuid, jsonb) to anon, authenticated;

-- ── save_entry: in secure splits, you can only enter your own ────────────────
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
  v_share jsonb; v_share_count int := 0;
  v_secure boolean; v_access text; v_me uuid; v_existing_payer uuid;
begin
  select secure, access_mode into v_secure, v_access from splits where id = v_split;
  if v_secure then
    v_me := _caller_participant(v_split);
    if v_me is null then raise exception 'not_a_member'; end if;
    -- You can only record entries where you are the payer ("paid_by" = you).
    if v_paid_by is distinct from v_me then raise exception 'not_your_entry'; end if;
    -- Editing: the existing entry must already be yours.
    if v_id is not null then
      select paid_by into v_existing_payer from entries where id = v_id and split_id = v_split;
      if v_existing_payer is distinct from v_me then raise exception 'not_your_entry'; end if;
    end if;
    -- access_mode 'all': nobody can settle up until every slot is claimed.
    if v_kind = 'transfer' and v_access = 'all'
       and exists (select 1 from participants where split_id = v_split and user_id is null) then
      raise exception 'awaiting_claims';
    end if;
  end if;

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
      values (v_id, (v_share->>'participant_id')::uuid,
        coalesce(nullif(v_share->>'weight', '')::numeric, 1),
        nullif(v_share->>'amount_cents', '')::bigint);
    end loop;
  end if;
  perform _touch_split(v_split);
  return v_id;
end $$;

-- ── delete_entry: in secure splits, only the payer who owns it ───────────────
create or replace function public.delete_entry(p_key text, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_split uuid := _require_split(p_key); v_secure boolean; v_me uuid; v_payer uuid;
begin
  select secure into v_secure from splits where id = v_split;
  if v_secure then
    v_me := _caller_participant(v_split);
    select paid_by into v_payer from entries where id = p_id and split_id = v_split;
    if v_me is null or v_payer is distinct from v_me then raise exception 'not_your_entry'; end if;
  end if;
  delete from entries where id = p_id and split_id = v_split;
  if not found then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
  perform _touch_split(v_split);
end $$;

-- ── creator-only management in secure splits ─────────────────────────────────
create or replace function public._require_creator(p_split uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_secure boolean; v_creator uuid;
begin
  select secure, created_by into v_secure, v_creator from splits where id = p_split;
  if v_secure and (auth.uid() is null or auth.uid() is distinct from v_creator) then
    raise exception 'creator_only';
  end if;
end $$;

create or replace function public.add_participant(p_key text, p_name text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key); v_pid uuid;
begin
  perform _require_creator(v_id);
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name_required'; end if;
  insert into participants (split_id, name, position)
  values (v_id, trim(p_name), (select coalesce(max(position), -1) + 1 from participants where split_id = v_id))
  returning id into v_pid;
  perform _touch_split(v_id);
  return v_pid;
end $$;

create or replace function public.rename_participant(p_key text, p_id uuid, p_name text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key);
begin
  perform _require_creator(v_id);
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'name_required'; end if;
  update participants set name = trim(p_name) where id = p_id and split_id = v_id;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  perform _touch_split(v_id);
end $$;

create or replace function public.delete_participant(p_key text, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key);
begin
  perform _require_creator(v_id);
  if exists (
    select 1 from entries e where e.split_id = v_id and (e.paid_by = p_id or e.transfer_to = p_id)
    union all
    select 1 from entry_shares s join entries e on e.id = s.entry_id
    where e.split_id = v_id and s.participant_id = p_id
  ) then raise exception 'participant_has_entries' using errcode = '23503'; end if;
  delete from participants where id = p_id and split_id = v_id;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  perform _touch_split(v_id);
end $$;

create or replace function public.update_split(p_key text, p_title text, p_currency text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key); v_has_entries boolean;
begin
  perform _require_creator(v_id);
  select exists(select 1 from entries where split_id = v_id) into v_has_entries;
  update splits set
    title = coalesce(nullif(trim(p_title), ''), title),
    currency = case when v_has_entries then currency else coalesce(nullif(trim(p_currency), ''), currency) end,
    last_activity = now()
  where id = v_id;
end $$;

create or replace function public.set_auto_purge(p_key text, p_on boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key);
begin
  perform _require_creator(v_id);
  update splits set auto_purge = p_on, last_activity = now() where id = v_id;
end $$;

create or replace function public.set_keep_payment(p_key text, p_on boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key);
begin
  perform _require_creator(v_id);
  update splits set keep_payment_methods = p_on, last_activity = now() where id = v_id;
end $$;

-- ── split_data: visibility gate + secure/claim info ──────────────────────────
create or replace function public.split_data(p_key text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid; v_secure boolean; v_vis text; v_creator uuid; v_me uuid;
begin
  select id into v_id from splits where key = p_key;
  if v_id is null then
    insert into lookup_failures (hour, count) values (date_trunc('hour', now()), 1)
      on conflict (hour) do update set count = lookup_failures.count + 1;
    return jsonb_build_object('not_found', true);
  end if;

  select secure, visibility, created_by into v_secure, v_vis, v_creator from splits where id = v_id;
  v_me := _caller_participant(v_id);

  -- Members-only secure splits: only the creator or a claimed member may read.
  if v_secure and v_vis = 'members'
     and (auth.uid() is null or (auth.uid() is distinct from v_creator and v_me is null)) then
    return jsonb_build_object('forbidden', true);
  end if;

  update splits set last_activity = now()
  where id = v_id and last_activity < now() - interval '1 day';

  return jsonb_build_object(
    'split', (select jsonb_build_object(
        'key', k.key, 'title', k.title, 'currency', k.currency, 'created_at', k.created_at,
        'has_owner', k.created_by is not null, 'auto_purge', k.auto_purge,
        'keep_payment_methods', k.keep_payment_methods,
        'secure', k.secure, 'access_mode', k.access_mode,
        'visibility', k.visibility, 'claim_mode', k.claim_mode,
        'is_creator', (auth.uid() is not null and auth.uid() = k.created_by),
        'me_participant', v_me
      ) from splits k where k.id = v_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'position', p.position,
        'payment_methods', p.payment_methods,
        'payment_changed_at', p.payment_changed_at,
        'payment_type', p.payment_methods->0->>'type',
        'payment_value', p.payment_methods->0->>'value',
        'claimed', p.user_id is not null,
        'is_me', (auth.uid() is not null and p.user_id = auth.uid()),
        'has_invite', p.invite_email is not null
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

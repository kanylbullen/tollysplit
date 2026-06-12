-- Allow several payment methods per participant, so the payer can pick the one
-- that suits them. Replaces the single payment_type/payment_value pair with a
-- JSONB array of { type, value } on participants. The legacy columns are kept
-- (now unused by the app) and backfilled into the array.

-- 1. New column + backfill existing single methods.
alter table participants add column if not exists payment_methods jsonb not null default '[]'::jsonb;

update participants
set payment_methods = jsonb_build_array(jsonb_build_object('type', payment_type, 'value', payment_value))
where payment_type is not null and payment_value is not null
  and payment_methods = '[]'::jsonb;

-- 2. Writer RPC: replace a participant's whole method list (validated). An empty
--    array clears all methods. Caps at 8 to keep the UI and storage sane.
create or replace function public.set_payment_methods(p_key text, p_id uuid, p_methods jsonb)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid := _require_split(p_key);
  v_out jsonb := '[]'::jsonb;
  m jsonb;
  v_type text;
  v_raw text;
  v_clean text;
  v_count int := 0;
begin
  if p_methods is null or jsonb_typeof(p_methods) <> 'array' then
    raise exception 'bad_payment_value';
  end if;
  for m in select * from jsonb_array_elements(p_methods) loop
    v_count := v_count + 1;
    if v_count > 8 then raise exception 'too_many_methods'; end if;
    v_type := m->>'type';
    v_raw := coalesce(m->>'value', '');
    if v_type not in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut') then raise exception 'bad_payment_type'; end if;
    if length(trim(v_raw)) = 0 then raise exception 'bad_payment_value'; end if;
    if v_type = 'iban' then
      v_clean := upper(replace(v_raw, ' ', ''));
      if v_clean !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$' then raise exception 'bad_payment_value'; end if;
    elsif v_type = 'revolut' then
      v_clean := lower(regexp_replace(trim(v_raw), '^@', ''));
      if v_clean !~ '^[a-z0-9]{4,30}$' then raise exception 'bad_payment_value'; end if;
    else
      v_clean := replace(replace(v_raw, ' ', ''), '-', '');
      if v_clean !~ '^\+?[0-9]{6,15}$' then raise exception 'bad_payment_value'; end if;
    end if;
    v_out := v_out || jsonb_build_object('type', v_type, 'value', v_clean);
  end loop;
  update participants
    set payment_methods = v_out, payment_type = null, payment_value = null
    where id = p_id and split_id = v_id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

grant execute on function public.set_payment_methods(text, uuid, jsonb) to anon, authenticated;

-- 2b. Keep the legacy single-method RPC working, but route it through the array
--     so the array stays the single source of truth during the rollout window
--     (production still runs the old code until the multi-method PR merges).
create or replace function public.set_payment_method(p_key text, p_id uuid, p_type text, p_value text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  if p_type is null or p_value is null or length(trim(p_value)) = 0 then
    perform public.set_payment_methods(p_key, p_id, '[]'::jsonb);
  else
    perform public.set_payment_methods(
      p_key, p_id, jsonb_build_array(jsonb_build_object('type', p_type, 'value', p_value))
    );
  end if;
end $$;

-- 3. Settle wipe now clears the array too.
create or replace function public.clear_payment_methods(p_key text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update participants set payment_methods = '[]'::jsonb, payment_type = null, payment_value = null
  where split_id = v_id and (payment_methods <> '[]'::jsonb or payment_type is not null or payment_value is not null);
end $$;

-- 4. split_data exposes the array instead of the single pair.
create or replace function public.split_data(p_key text)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from splits where key = p_key;
  if v_id is null then
    insert into lookup_failures (hour, count) values (date_trunc('hour', now()), 1)
      on conflict (hour) do update set count = lookup_failures.count + 1;
    return jsonb_build_object('not_found', true);
  end if;

  update splits set last_activity = now()
  where id = v_id and last_activity < now() - interval '1 day';

  return jsonb_build_object(
    'split', (select jsonb_build_object(
        'key', k.key, 'title', k.title, 'currency', k.currency, 'created_at', k.created_at,
        'has_owner', k.created_by is not null, 'auto_purge', k.auto_purge
      ) from splits k where k.id = v_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'position', p.position,
        'payment_methods', p.payment_methods,
        -- Legacy fields (first method) for the still-deployed single-method code.
        'payment_type', p.payment_methods->0->>'type',
        'payment_value', p.payment_methods->0->>'value'
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

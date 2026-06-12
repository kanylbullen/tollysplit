-- Track whether a participant's payment details ever changed from what was
-- first entered, so the pay dialog can warn the payer (anyone with the link
-- can edit payment info — a swapped Swish number or lightning address is the
-- main abuse vector, and crypto payments are irreversible).
--
-- payment_original    first non-empty method list ever set; never rewritten.
-- payment_changed_at  set whenever a save differs from the original; never
--                     cleared, so changing back does not hide that a change
--                     happened. The privacy wipe (clearing to empty) does not
--                     count, and re-adding the identical original is silent.

alter table participants add column if not exists payment_original jsonb;
alter table participants add column if not exists payment_changed_at timestamptz;

-- Backfill: treat current methods as the original for existing participants.
update participants
set payment_original = payment_methods
where payment_original is null and payment_methods <> '[]'::jsonb;

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
    if v_type not in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut', 'lightning') then raise exception 'bad_payment_type'; end if;
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
    else
      v_clean := replace(replace(v_raw, ' ', ''), '-', '');
      if v_clean !~ '^\+?[0-9]{6,15}$' then raise exception 'bad_payment_value'; end if;
    end if;
    v_out := v_out || jsonb_build_object('type', v_type, 'value', v_clean);
  end loop;
  -- Right-hand sides reference the pre-update row, so payment_original here
  -- is the value before this save.
  update participants set
    payment_methods = v_out,
    payment_type = null,
    payment_value = null,
    payment_original = case
      when payment_original is null and v_out <> '[]'::jsonb then v_out
      else payment_original
    end,
    payment_changed_at = case
      when payment_original is not null and v_out <> '[]'::jsonb and v_out <> payment_original then now()
      else payment_changed_at
    end
    where id = p_id and split_id = v_id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

grant execute on function public.set_payment_methods(text, uuid, jsonb) to anon, authenticated;

-- split_data: expose payment_changed_at on participants.
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
        'has_owner', k.created_by is not null, 'auto_purge', k.auto_purge,
        'keep_payment_methods', k.keep_payment_methods
      ) from splits k where k.id = v_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'position', p.position,
        'payment_methods', p.payment_methods,
        'payment_changed_at', p.payment_changed_at,
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

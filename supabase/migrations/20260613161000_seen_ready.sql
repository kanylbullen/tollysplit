-- "Seen" + "ready" tracking, so a group doesn't settle up before everyone has
-- weighed in. Each participant gets:
--   seen_at  — set automatically the first time their identity opens the split;
--   ready_at — set when they mark themselves done ("I have no more expenses").
-- The pay dialog warns when not everyone has seen the split yet.

alter table participants add column if not exists seen_at timestamptz;
alter table participants add column if not exists ready_at timestamptz;

-- Record that a participant has opened the split (idempotent — keeps the first
-- timestamp). Secure splits: only your own claimed slot.
create or replace function public.mark_seen(p_key text, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key); v_secure boolean; v_owner uuid;
begin
  select secure into v_secure from splits where id = v_id;
  if v_secure then
    select user_id into v_owner from participants where id = p_id and split_id = v_id;
    if v_owner is null or v_owner is distinct from auth.uid() then return; end if;
  end if;
  update participants set seen_at = coalesce(seen_at, now())
  where id = p_id and split_id = v_id and seen_at is null;
end $$;
grant execute on function public.mark_seen(text, uuid) to anon, authenticated;

-- Toggle "I'm done adding expenses". Marking ready also counts as seen.
-- Secure splits: only your own claimed slot.
create or replace function public.set_ready(p_key text, p_id uuid, p_on boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid := _require_split(p_key); v_secure boolean; v_owner uuid;
begin
  select secure into v_secure from splits where id = v_id;
  if v_secure then
    select user_id into v_owner from participants where id = p_id and split_id = v_id;
    if v_owner is null or v_owner is distinct from auth.uid() then raise exception 'not_your_participant'; end if;
  end if;
  update participants set
    ready_at = case when p_on then coalesce(ready_at, now()) else null end,
    seen_at = case when p_on then coalesce(seen_at, now()) else seen_at end
  where id = p_id and split_id = v_id;
  if not found then raise exception 'participant_not_found' using errcode = 'P0002'; end if;
  perform _touch_split(v_id);
end $$;
grant execute on function public.set_ready(text, uuid, boolean) to anon, authenticated;

-- split_data: expose seen_at/ready_at (rebuilt on top of the secure version).
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
        'has_invite', p.invite_email is not null,
        'seen_at', p.seen_at,
        'ready_at', p.ready_at
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

-- Make the "wipe payment info once everyone is square" behaviour opt-out.
-- Long-running splits get expenses and partial payments over time, so wiping
-- the moment balances briefly hit zero is annoying. Default keeps the existing
-- behaviour (wipe = keep_payment_methods false); a per-split toggle disables it.

alter table splits add column if not exists keep_payment_methods boolean not null default false;

create or replace function public.set_keep_payment(p_key text, p_on boolean)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key);
begin
  update splits set keep_payment_methods = p_on, last_activity = now() where id = v_id;
end $$;

grant execute on function public.set_keep_payment(text, boolean) to anon, authenticated;

-- split_data now exposes the flag (and still everything else, unchanged).
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

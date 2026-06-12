-- Add Lightning (LUD-16 Lightning Address) as a payment method.
--
-- The stored value is a lightning address ("satoshi@strike.me") — an email-like
-- identifier behind which the recipient's wallet provider hosts an open
-- LNURL-pay endpoint. The app exchanges it for a BOLT11 invoice on the exact
-- amount at pay time (see /api/ln-invoice); we never touch the funds.
-- Canonical form: lowercased, no surrounding whitespace.

alter table participants drop constraint participants_payment_type_check;
alter table participants add constraint participants_payment_type_check
  check (payment_type in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut', 'lightning'));

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
  update participants
    set payment_methods = v_out, payment_type = null, payment_value = null
    where id = p_id and split_id = v_id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  perform _touch_split(v_id);
end $$;

grant execute on function public.set_payment_methods(text, uuid, jsonb) to anon, authenticated;

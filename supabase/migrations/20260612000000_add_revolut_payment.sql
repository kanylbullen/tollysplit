-- Add Revolut (revtag) as a payment method.
--
-- A revtag is Revolut's @username. We store it canonical: lowercase, no leading
-- '@'. The payee's revtag turns into a https://revolut.me/{tag}/{amount}{ccy}
-- deep link in the UI — the Revolut equivalent of the Swish app link. We never
-- move or confirm money; the payer still marks the transfer as paid manually.

-- 1. Widen the column CHECK to allow the new type.
alter table participants drop constraint participants_payment_type_check;
alter table participants add constraint participants_payment_type_check
  check (payment_type in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut'));

-- 2. Teach the writer RPC to accept and validate revtags.
create or replace function public.set_payment_method(p_key text, p_id uuid, p_type text, p_value text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid := _require_split(p_key); v_clean text;
begin
  if p_type is null or p_value is null or length(trim(p_value)) = 0 then
    update participants set payment_type = null, payment_value = null where id = p_id and split_id = v_id;
  else
    if p_type not in ('swish', 'vipps', 'mobilepay', 'iban', 'revolut') then raise exception 'bad_payment_type'; end if;
    if p_type = 'iban' then
      v_clean := upper(replace(p_value, ' ', ''));
      if v_clean !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$' then raise exception 'bad_payment_value'; end if;
    elsif p_type = 'revolut' then
      v_clean := lower(regexp_replace(trim(p_value), '^@', ''));
      if v_clean !~ '^[a-z0-9]{4,30}$' then raise exception 'bad_payment_value'; end if;
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

grant execute on function public.set_payment_method(text, uuid, text, text) to anon, authenticated;

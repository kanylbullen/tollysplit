-- Include secure splits the user has claimed a slot in (not just ones they
-- created), so claimed members can find them in "your splits".
create or replace function public.my_splits()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', k.key, 'title', k.title, 'currency', k.currency, 'created_at', k.created_at,
    'participant_count', (select count(*) from participants p where p.split_id = k.id),
    'entry_count', (select count(*) from entries e where e.split_id = k.id)
  ) order by k.created_at desc), '[]'::jsonb)
  from splits k
  where k.created_by = auth.uid()
     or exists (select 1 from participants p where p.split_id = k.id and p.user_id = auth.uid())
$$;

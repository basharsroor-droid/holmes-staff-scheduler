create index if not exists operational_events_actor_created_idx
  on public.operational_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

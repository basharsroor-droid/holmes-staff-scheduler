-- The five-argument overload temporarily kept the pre-deployment frontend
-- compatible while the plan-aware six-argument RPC was rolling out.
drop function if exists public.create_organization_workspace(text, text, text, text, text);

-- plan_id is a foreign key and is used for plan-level subscription queries.
create index if not exists subscriptions_plan_id_idx
  on public.subscriptions (plan_id);

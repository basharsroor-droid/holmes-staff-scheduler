-- A3 from docs/REMEDIATION_PLAN.md (Wave 2).
--
-- 27 of the 32 SECURITY DEFINER RPCs pin search_path = '' so a definer
-- function can never resolve an object through a schema the caller
-- controls. The five Open Shifts RPCs added in September used
-- search_path = public, private instead. Not an exploitable hole (both
-- schemas are owner-controlled), but it breaks the project's invariant,
-- and the Supabase linter and D3's future invariant check key off it.
--
-- No function body needs to change: every table, %rowtype and function
-- reference in all five is already schema-qualified (public.*, private.*,
-- auth.uid()), and everything else they call (now, trim, nullif, coalesce,
-- jsonb_build_object, count) lives in pg_catalog, which is always searched.
-- Verified on staging inside a rolled-back transaction: after the change
-- each function still reaches its own business error for an unknown id,
-- never "relation does not exist".

alter function public.cancel_open_shift_request(uuid) set search_path = '';
alter function public.check_open_shift_eligibility(uuid) set search_path = '';
alter function public.decide_open_shift_request(uuid, public.open_shift_request_status, text) set search_path = '';
alter function public.request_open_shift(uuid, text) set search_path = '';
alter function public.set_shift_open_for_requests(uuid, boolean) set search_path = '';

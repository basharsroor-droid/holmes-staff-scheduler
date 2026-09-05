-- Pilot Mode narrows a first-pilot organization down to the core scheduling
-- loop (availability -> build -> basic checks -> publish -> swap) and hides
-- the Intelligence/WOW layer (ShiftPilot Score, Fairness, Smart Draft, Fix My
-- Schedule, Smart Replacement, Shift Marketplace) until a clean first cycle
-- has run. It does not remove any capability -- it only controls what a
-- pilot organization sees, per organization. Nothing else changes behavior:
-- default is false, so every existing organization is unaffected.
alter table public.organizations
  add column pilot_mode boolean not null default false;

comment on column public.organizations.pilot_mode is
  'When true, the workspace hides the Intelligence/WOW panels (Score, Fairness, Smart Draft, Fix My Schedule, Smart Replacement, Shift Marketplace) and shows only the core availability -> schedule -> publish -> swap loop. Toggled by staff via SQL for a first-pilot organization, not self-serve.';

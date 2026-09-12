-- Android push: the delivery queue has to say which push service a row is for.
--
-- push_devices has carried `platform` since the table was created, but the
-- queue only copied `environment` (an APNs concept: sandbox vs production).
-- The cron route therefore had no way to tell an iPhone token from an Android
-- one, and sent everything to APNs. With an Android build that would silently
-- fail on every Android device.
--
-- So: carry the platform onto each queued row, defaulting to 'ios' for the
-- rows that exist today (every device registered so far is an iPhone --
-- app/api/push/devices/route.ts hardcoded platform 'ios' until now).
-- lib/push/dispatch.ts picks the sender from this column.

alter table public.push_delivery_queue
  add column if not exists platform text not null default 'ios';

alter table public.push_delivery_queue
  drop constraint if exists push_delivery_queue_platform_check;

alter table public.push_delivery_queue
  add constraint push_delivery_queue_platform_check check (platform in ('ios', 'android'));

comment on column public.push_delivery_queue.platform is
  'Which push service delivers this row: ios = APNs, android = FCM. Copied from push_devices at enqueue time.';

-- Existing rows: take the platform from the device they were queued for.
update public.push_delivery_queue q
set platform = d.platform
from public.push_devices d
where d.id = q.device_id
  and d.platform in ('ios', 'android')
  and q.platform <> d.platform;

-- Same body as before, with d.platform added to the insert. Unchanged
-- otherwise: in-app channel only, respects the user's notification
-- preferences, and fans out to every active device of that user.
create or replace function private.queue_push_for_in_app_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.channel <> 'in_app'
     or not private.email_preference_enabled(new.organization_id, new.user_id, new.template_key) then
    return new;
  end if;

  insert into public.push_delivery_queue (
    notification_id, device_id, organization_id, user_id, device_token,
    environment, platform, template_key, payload, scheduled_for
  )
  select new.id, d.id, new.organization_id, new.user_id, d.token,
    d.environment, d.platform, new.template_key, new.payload, greatest(new.scheduled_for, now())
  from public.push_devices d
  where d.organization_id = new.organization_id
    and d.user_id = new.user_id
    and d.active;

  return new;
end;
$function$;

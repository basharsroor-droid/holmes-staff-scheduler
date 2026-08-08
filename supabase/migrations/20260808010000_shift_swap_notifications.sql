-- Create in-app notifications for the shift-swap workflow.

create unique index if not exists notifications_swap_event_once_idx
  on public.notifications (
    user_id,
    template_key,
    ((payload ->> 'swap_request_id'))
  )
  where payload ? 'swap_request_id';

create or replace function private.notify_shift_swap_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_key text;
begin
  if tg_op = 'INSERT' then
    if new.target_user_id is not null then
      insert into public.notifications (
        organization_id, user_id, channel, template_key, payload, status, scheduled_for
      ) values (
        new.organization_id,
        new.target_user_id,
        'in_app',
        'swap_request_received',
        jsonb_build_object('swap_request_id', new.id, 'status', new.status),
        'pending',
        now()
      ) on conflict do nothing;
    end if;
    return new;
  end if;

  if new.status = old.status then return new; end if;

  if new.status = 'pending_manager' then
    insert into public.notifications (
      organization_id, user_id, channel, template_key, payload, status, scheduled_for
    )
    select
      new.organization_id,
      membership.user_id,
      'in_app',
      'swap_waiting_manager',
      jsonb_build_object('swap_request_id', new.id, 'status', new.status),
      'pending',
      now()
    from public.organization_memberships membership
    where membership.organization_id = new.organization_id
      and membership.status = 'active'
      and membership.role in ('owner','admin','manager')
    on conflict do nothing;
    return new;
  end if;

  notification_key := case new.status
    when 'approved' then 'swap_approved'
    when 'rejected' then 'swap_rejected'
    when 'cancelled' then 'swap_cancelled'
    else null
  end;

  if notification_key is not null then
    insert into public.notifications (
      organization_id, user_id, channel, template_key, payload, status, scheduled_for
    )
    select
      new.organization_id,
      recipient.user_id,
      'in_app',
      notification_key,
      jsonb_build_object('swap_request_id', new.id, 'status', new.status),
      'pending',
      now()
    from (
      select distinct user_id
      from (values (new.requested_by), (new.target_user_id)) as users(user_id)
      where user_id is not null
    ) recipient
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.notify_shift_swap_change() from public, anon, authenticated;

drop trigger if exists notify_shift_swap_change on public.swap_requests;
create trigger notify_shift_swap_change
after insert or update of status on public.swap_requests
for each row execute function private.notify_shift_swap_change();

comment on function private.notify_shift_swap_change()
  is 'Creates deduplicated in-app notifications for swap participants and managers.';

-- RLS policies execute as the querying role and therefore need EXECUTE on
-- every private helper they reference. The private schema is not exposed by
-- the Data API, so this does not create callable public RPC endpoints.

grant execute on function private.can_access_branch(uuid) to authenticated;
grant execute on function private.can_access_membership(uuid) to authenticated;
grant execute on function private.can_manage_invitation_branch(uuid, uuid) to authenticated;
grant execute on function private.can_manage_swap_request(uuid) to authenticated;
grant execute on function private.can_access_schedule_period(uuid) to authenticated;
grant execute on function private.can_manage_schedule_period(uuid) to authenticated;

revoke all on function private.can_access_branch(uuid) from anon;
revoke all on function private.can_access_membership(uuid) from anon;
revoke all on function private.can_manage_invitation_branch(uuid, uuid) from anon;
revoke all on function private.can_manage_swap_request(uuid) from anon;
revoke all on function private.can_access_schedule_period(uuid) from anon;
revoke all on function private.can_manage_schedule_period(uuid) from anon;

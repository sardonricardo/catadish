-- Catadish DB v3.2
-- Open share links for group invites (Google Drive style)
-- Keeps email invites as optional restricted mode.

begin;

-- 1) Make email optional for link-based invites.
alter table public.group_invites
  alter column email drop not null;

-- 2) Replace legacy unique constraint with partial unique index only for pending email invites.
alter table public.group_invites
  drop constraint if exists group_invites_group_id_email_status_key;

drop index if exists group_invites_pending_email_unique;
create unique index group_invites_pending_email_unique
  on public.group_invites (group_id, lower(email))
  where email is not null and status = 'pending';

-- 3) Policies: allow reading pending open-link invites (email is null) by authenticated users.
drop policy if exists "Group members can read invites" on public.group_invites;
create policy "Group members can read invites"
on public.group_invites for select
using (
  public.is_group_member(group_id)
  or (
    status = 'pending'
    and expires_at > now()
    and (
      email is null
      or lower(email) = lower(auth.email())
    )
  )
);

-- 4) Update RPC: accept invite if email matches OR invite is open-link (email null).
create or replace function public.accept_group_invite(_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_invites%rowtype;
  v_user_id uuid;
  v_user_email text;
begin
  v_user_id := auth.uid();
  v_user_email := auth.email();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_invite
  from public.group_invites
  where token = _token
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invite not found, expired, or already used';
  end if;

  if v_invite.email is not null
     and lower(coalesce(v_invite.email, '')) <> lower(coalesce(v_user_email, '')) then
    raise exception 'Invite email does not match authenticated user';
  end if;

  insert into public.group_members (group_id, user_id, role, invited_by)
  values (v_invite.group_id, v_user_id, 'member', v_invite.invited_by)
  on conflict (group_id, user_id) do nothing;

  update public.group_invites
  set status = 'accepted', updated_at = now()
  where id = v_invite.id;

  return v_invite.group_id;
end;
$$;

grant execute on function public.accept_group_invite(uuid) to authenticated;

commit;

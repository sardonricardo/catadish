-- Fix CRUD RLS for restaurants/groups in legacy rows and creator fallback.

begin;

-- ---------------------------------------------------------------------------
-- Restaurants: allow owner CRUD, and allow claiming legacy rows with created_by is null on update.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update own restaurants" on public.restaurants;
create policy "Users can update own restaurants"
on public.restaurants for update
using (auth.uid() = created_by or created_by is null)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete own restaurants" on public.restaurants;
create policy "Users can delete own restaurants"
on public.restaurants for delete
using (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- Groups: creator can always read/update/delete, even if membership row is missing.
-- ---------------------------------------------------------------------------
drop policy if exists "Group members can read groups" on public.groups;
create policy "Group members can read groups"
on public.groups for select
to authenticated
using (created_by = auth.uid() or public.is_group_member(id));

drop policy if exists "Owners and admins can update groups" on public.groups;
create policy "Owners and admins can update groups"
on public.groups for update
to authenticated
using (created_by = auth.uid() or public.is_group_admin_or_owner(id))
with check (created_by = auth.uid() or public.is_group_admin_or_owner(id));

drop policy if exists "Owners can delete groups" on public.groups;
create policy "Owners can delete groups"
on public.groups for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
);

commit;

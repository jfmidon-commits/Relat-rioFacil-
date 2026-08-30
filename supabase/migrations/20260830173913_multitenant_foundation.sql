create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.client_role as enum ('owner', 'admin', 'member');
create type public.client_status as enum ('active', 'paused');
create type public.visit_status as enum ('submitted', 'processing', 'completed', 'error');
create type public.visit_classification as enum ('excellent', 'good', 'attention', 'critical');
create type public.report_status as enum ('pending', 'generated', 'sent', 'error');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  status public.client_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.client_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  store_id uuid not null,
  auditor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  score numeric(4,2) check (score is null or (score >= 0 and score <= 10)),
  classification public.visit_classification,
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object'),
  nonconformities jsonb not null default '[]'::jsonb check (jsonb_typeof(nonconformities) = 'array'),
  notes text,
  status public.visit_status not null default 'submitted',
  source text not null default 'web' check (char_length(source) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id),
  constraint visits_store_same_client_fk
    foreign key (store_id, client_id)
    references public.stores(id, client_id)
    on delete restrict
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  visit_id uuid not null,
  version integer not null default 1 check (version > 0),
  status public.report_status not null default 'pending',
  pdf_url text,
  sent_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visit_id, version),
  constraint reports_visit_same_client_fk
    foreign key (visit_id, client_id)
    references public.visits(id, client_id)
    on delete cascade
);

create index client_memberships_user_client_idx
  on public.client_memberships (user_id, client_id)
  where is_active;
create index client_memberships_client_role_idx
  on public.client_memberships (client_id, role)
  where is_active;
create index stores_client_active_idx
  on public.stores (client_id, is_active);
create index visits_client_occurred_idx
  on public.visits (client_id, occurred_at desc);
create index visits_store_occurred_idx
  on public.visits (store_id, occurred_at desc);
create index visits_auditor_occurred_idx
  on public.visits (auditor_user_id, occurred_at desc)
  where auditor_user_id is not null;
create index reports_client_created_idx
  on public.reports (client_id, created_at desc);
create index reports_visit_idx
  on public.reports (visit_id);
create index reports_status_idx
  on public.reports (client_id, status);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.add_client_owner()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.created_by is not null then
    insert into public.client_memberships (client_id, user_id, role, is_active)
    values (new.id, new.created_by, 'owner', true)
    on conflict (client_id, user_id)
    do update set role = 'owner', is_active = true;
  end if;
  return new;
end;
$$;

create or replace function private.user_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select cm.client_id
  from public.client_memberships cm
  where cm.user_id = (select auth.uid())
    and cm.is_active = true;
$$;

create or replace function private.has_client_role(
  target_client_id uuid,
  allowed_roles public.client_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.client_memberships cm
      where cm.client_id = target_client_id
        and cm.user_id = (select auth.uid())
        and cm.is_active = true
        and cm.role = any(allowed_roles)
    );
$$;

create or replace function private.prevent_client_id_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.client_id is distinct from old.client_id then
    raise exception 'client_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_membership_identity_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.client_id is distinct from old.client_id
     or new.user_id is distinct from old.user_id then
    raise exception 'membership identity is immutable';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_client_creator_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger clients_set_updated_at
before update on public.clients
for each row execute function private.set_updated_at();
create trigger stores_set_updated_at
before update on public.stores
for each row execute function private.set_updated_at();
create trigger visits_set_updated_at
before update on public.visits
for each row execute function private.set_updated_at();
create trigger reports_set_updated_at
before update on public.reports
for each row execute function private.set_updated_at();

create trigger clients_add_owner
after insert on public.clients
for each row execute function private.add_client_owner();

create trigger clients_prevent_creator_change
before update on public.clients
for each row execute function private.prevent_client_creator_change();
create trigger memberships_prevent_identity_change
before update on public.client_memberships
for each row execute function private.prevent_membership_identity_change();
create trigger stores_prevent_client_change
before update on public.stores
for each row execute function private.prevent_client_id_change();
create trigger visits_prevent_client_change
before update on public.visits
for each row execute function private.prevent_client_id_change();
create trigger reports_prevent_client_change
before update on public.reports
for each row execute function private.prevent_client_id_change();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, full_name)
select
  u.id,
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), '')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_memberships enable row level security;
alter table public.stores enable row level security;
alter table public.visits enable row level security;
alter table public.reports enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy clients_select_member
on public.clients
for select
to authenticated
using (id in (select private.user_client_ids()));

create policy clients_insert_self_owned
on public.clients
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
);

create policy clients_update_admin
on public.clients
for update
to authenticated
using ((select private.has_client_role(id, array['owner','admin']::public.client_role[])))
with check ((select private.has_client_role(id, array['owner','admin']::public.client_role[])));

create policy clients_delete_owner
on public.clients
for delete
to authenticated
using ((select private.has_client_role(id, array['owner']::public.client_role[])));

create policy memberships_select_member
on public.client_memberships
for select
to authenticated
using (client_id in (select private.user_client_ids()));

create policy memberships_insert_owner
on public.client_memberships
for insert
to authenticated
with check ((select private.has_client_role(client_id, array['owner']::public.client_role[])));

create policy memberships_update_owner
on public.client_memberships
for update
to authenticated
using ((select private.has_client_role(client_id, array['owner']::public.client_role[])))
with check ((select private.has_client_role(client_id, array['owner']::public.client_role[])));

create policy memberships_delete_owner
on public.client_memberships
for delete
to authenticated
using ((select private.has_client_role(client_id, array['owner']::public.client_role[])));

create policy stores_select_member
on public.stores
for select
to authenticated
using (client_id in (select private.user_client_ids()));

create policy stores_insert_admin
on public.stores
for insert
to authenticated
with check ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy stores_update_admin
on public.stores
for update
to authenticated
using ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])))
with check ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy stores_delete_admin
on public.stores
for delete
to authenticated
using ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy visits_select_member
on public.visits
for select
to authenticated
using (client_id in (select private.user_client_ids()));

create policy visits_insert_member
on public.visits
for insert
to authenticated
with check (
  client_id in (select private.user_client_ids())
  and (auditor_user_id is null or auditor_user_id = (select auth.uid()))
);

create policy visits_update_author_or_admin
on public.visits
for update
to authenticated
using (
  client_id in (select private.user_client_ids())
  and (
    auditor_user_id is null
    or auditor_user_id = (select auth.uid())
    or (select private.has_client_role(client_id, array['owner','admin']::public.client_role[]))
  )
)
with check (
  client_id in (select private.user_client_ids())
  and (
    auditor_user_id is null
    or auditor_user_id = (select auth.uid())
    or (select private.has_client_role(client_id, array['owner','admin']::public.client_role[]))
  )
);

create policy visits_delete_admin
on public.visits
for delete
to authenticated
using ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy reports_select_member
on public.reports
for select
to authenticated
using (client_id in (select private.user_client_ids()));

create policy reports_insert_admin
on public.reports
for insert
to authenticated
with check ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy reports_update_admin
on public.reports
for update
to authenticated
using ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])))
with check ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

create policy reports_delete_admin
on public.reports
for delete
to authenticated
using ((select private.has_client_role(client_id, array['owner','admin']::public.client_role[])));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.client_memberships from anon, authenticated;
revoke all on table public.stores from anon, authenticated;
revoke all on table public.visits from anon, authenticated;
revoke all on table public.reports from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.client_memberships to authenticated;
grant select, insert, update, delete on table public.stores to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;
grant select, insert, update, delete on table public.reports to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.add_client_owner() from public, anon, authenticated;
revoke all on function private.prevent_client_id_change() from public, anon, authenticated;
revoke all on function private.prevent_membership_identity_change() from public, anon, authenticated;
revoke all on function private.prevent_client_creator_change() from public, anon, authenticated;
revoke all on function private.user_client_ids() from public, anon, authenticated;
revoke all on function private.has_client_role(uuid, public.client_role[]) from public, anon, authenticated;

grant execute on function private.user_client_ids() to authenticated;
grant execute on function private.has_client_role(uuid, public.client_role[]) to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

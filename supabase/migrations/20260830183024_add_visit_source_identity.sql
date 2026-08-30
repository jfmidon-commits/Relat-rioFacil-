alter table public.visits
  add column source_ref text,
  add column source_updated_at timestamptz,
  add constraint visits_source_ref_length_chk
    check (source_ref is null or char_length(trim(source_ref)) between 1 and 160);

create unique index visits_client_source_ref_uidx
  on public.visits (client_id, source, source_ref)
  where source_ref is not null;

create index visits_client_source_updated_idx
  on public.visits (client_id, source, source_updated_at desc)
  where source_ref is not null;

create index clients_created_by_idx
  on public.clients (created_by)
  where created_by is not null;

create index visits_store_client_fk_idx
  on public.visits (store_id, client_id);

create index reports_visit_client_fk_idx
  on public.reports (visit_id, client_id);

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type HistoryFilters = {
  client?: string;
  store?: string;
  status?: string;
  from?: string;
  to?: string;
};

type ScopeClient = { id: string; name: string };
type ScopeStore = { id: string; name: string };

type HistoryScope = {
  clients: ScopeClient[];
  selectedClient: ScopeClient | null;
  stores: ScopeStore[];
  hasError: boolean;
};

export type VisitHistoryItem = {
  id: string;
  storeName: string;
  occurredAt: string;
  score: number | null;
  classification: string | null;
  status: string;
  nonconformities: number;
  notes: string | null;
};

export type ReportHistoryItem = {
  id: string;
  visitId: string;
  storeName: string;
  visitOccurredAt: string | null;
  version: number;
  status: string;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function startOfBrazilDay(value?: string) {
  return value && datePattern.test(value) ? `${value}T00:00:00-03:00` : null;
}

function endOfBrazilDay(value?: string) {
  return value && datePattern.test(value) ? `${value}T23:59:59.999-03:00` : null;
}

async function loadScope(requestedClientId?: string): Promise<{
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null;
  scope: HistoryScope;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        supabase: null,
        scope: { clients: [], selectedClient: null, stores: [], hasError: true },
      };
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("client_memberships")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (membershipsError) {
      return {
        supabase,
        scope: { clients: [], selectedClient: null, stores: [], hasError: true },
      };
    }

    const clientIds = (memberships ?? []).map((membership) => membership.client_id);
    if (!clientIds.length) {
      return {
        supabase,
        scope: { clients: [], selectedClient: null, stores: [], hasError: false },
      };
    }

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", clientIds)
      .order("name", { ascending: true });

    if (clientsError) {
      return {
        supabase,
        scope: { clients: [], selectedClient: null, stores: [], hasError: true },
      };
    }

    const clientRows = clients ?? [];
    const selectedClient =
      clientRows.find((client) => client.id === requestedClientId) ?? clientRows[0] ?? null;

    if (!selectedClient) {
      return {
        supabase,
        scope: { clients: clientRows, selectedClient: null, stores: [], hasError: false },
      };
    }

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, name")
      .eq("client_id", selectedClient.id)
      .order("name", { ascending: true });

    return {
      supabase,
      scope: {
        clients: clientRows,
        selectedClient,
        stores: storesError ? [] : stores ?? [],
        hasError: Boolean(storesError),
      },
    };
  } catch {
    return {
      supabase: null,
      scope: { clients: [], selectedClient: null, stores: [], hasError: true },
    };
  }
}

export async function getVisitHistory(filters: HistoryFilters): Promise<HistoryScope & { visits: VisitHistoryItem[] }> {
  const { supabase, scope } = await loadScope(filters.client);
  if (!supabase || scope.hasError || !scope.selectedClient) {
    return { ...scope, visits: [] };
  }

  const validStatuses = new Set(["submitted", "processing", "completed", "error"]);
  const selectedStore = scope.stores.find((store) => store.id === filters.store);
  const from = startOfBrazilDay(filters.from);
  const to = endOfBrazilDay(filters.to);

  let query = supabase
    .from("visits")
    .select("id, store_id, occurred_at, score, classification, status, nonconformities, notes")
    .eq("client_id", scope.selectedClient.id)
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (selectedStore) query = query.eq("store_id", selectedStore.id);
  if (filters.status && validStatuses.has(filters.status)) query = query.eq("status", filters.status);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);

  const { data: visits, error } = await query;
  if (error) return { ...scope, visits: [], hasError: true };

  const storeNameById = new Map(scope.stores.map((store) => [store.id, store.name]));

  return {
    ...scope,
    visits: (visits ?? []).map((visit) => ({
      id: visit.id,
      storeName: storeNameById.get(visit.store_id) ?? "Loja não identificada",
      occurredAt: visit.occurred_at,
      score: visit.score,
      classification: visit.classification,
      status: visit.status,
      nonconformities: Array.isArray(visit.nonconformities) ? visit.nonconformities.length : 0,
      notes: visit.notes,
    })),
  };
}

export async function getReportHistory(filters: HistoryFilters): Promise<HistoryScope & { reports: ReportHistoryItem[] }> {
  const { supabase, scope } = await loadScope(filters.client);
  if (!supabase || scope.hasError || !scope.selectedClient) {
    return { ...scope, reports: [] };
  }

  const validStatuses = new Set(["pending", "generated", "sent", "error"]);
  const from = startOfBrazilDay(filters.from);
  const to = endOfBrazilDay(filters.to);

  let query = supabase
    .from("reports")
    .select("id, visit_id, version, status, pdf_url, sent_at, created_at")
    .eq("client_id", scope.selectedClient.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status && validStatuses.has(filters.status)) query = query.eq("status", filters.status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: reports, error } = await query;
  if (error) return { ...scope, reports: [], hasError: true };

  const reportRows = reports ?? [];
  const visitIds = [...new Set(reportRows.map((report) => report.visit_id))];
  const visitById = new Map<string, { store_id: string; occurred_at: string }>();

  if (visitIds.length) {
    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("id, store_id, occurred_at")
      .eq("client_id", scope.selectedClient.id)
      .in("id", visitIds);

    if (visitsError) return { ...scope, reports: [], hasError: true };
    (visits ?? []).forEach((visit) => visitById.set(visit.id, visit));
  }

  const storeNameById = new Map(scope.stores.map((store) => [store.id, store.name]));

  return {
    ...scope,
    reports: reportRows.map((report) => {
      const visit = visitById.get(report.visit_id);
      return {
        id: report.id,
        visitId: report.visit_id,
        storeName: visit ? storeNameById.get(visit.store_id) ?? "Loja não identificada" : "Visita não identificada",
        visitOccurredAt: visit?.occurred_at ?? null,
        version: report.version,
        status: report.status,
        pdfUrl: report.pdf_url,
        sentAt: report.sent_at,
        createdAt: report.created_at,
      };
    }),
  };
}

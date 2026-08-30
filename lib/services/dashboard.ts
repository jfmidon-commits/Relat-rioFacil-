import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type DashboardVisit = {
  id: string;
  storeName: string;
  score: number | null;
  classification: string | null;
  occurredAt: string;
  status: string;
};

export type DashboardData = {
  client: { id: string; name: string; status: string } | null;
  role: string | null;
  metrics: {
    totalVisits: number;
    averageScore: number | null;
    nonconformities: number;
    reportsGenerated: number;
    reportsSent: number;
  };
  recentVisits: DashboardVisit[];
  needsOnboarding: boolean;
  hasError: boolean;
};

const emptyDashboard = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  client: null,
  role: null,
  metrics: {
    totalVisits: 0,
    averageScore: null,
    nonconformities: 0,
    reportsGenerated: 0,
    reportsSent: 0,
  },
  recentVisits: [],
  needsOnboarding: false,
  hasError: false,
  ...overrides,
});

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return emptyDashboard({ hasError: true });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("client_memberships")
      .select("client_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return emptyDashboard({ hasError: true });
    }

    if (!membership) {
      return emptyDashboard({ needsOnboarding: true });
    }

    const clientId = membership.client_id;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, status")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !client) {
      return emptyDashboard({ hasError: true });
    }

    const [visitsResult, recentResult, generatedResult, sentResult] = await Promise.all([
      supabase
        .from("visits")
        .select("score, nonconformities")
        .eq("client_id", clientId),
      supabase
        .from("visits")
        .select("id, store_id, score, classification, occurred_at, status")
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false })
        .limit(5),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .in("status", ["generated", "sent"]),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "sent"),
    ]);

    if (
      visitsResult.error ||
      recentResult.error ||
      generatedResult.error ||
      sentResult.error
    ) {
      return emptyDashboard({
        client,
        role: membership.role,
        hasError: true,
      });
    }

    const visits = visitsResult.data ?? [];
    const scoredVisits = visits.filter(
      (visit): visit is typeof visit & { score: number } => typeof visit.score === "number",
    );
    const averageScore = scoredVisits.length
      ? scoredVisits.reduce((sum, visit) => sum + visit.score, 0) / scoredVisits.length
      : null;
    const nonconformities = visits.reduce((total, visit) => {
      return total + (Array.isArray(visit.nonconformities) ? visit.nonconformities.length : 0);
    }, 0);

    const recentRows = recentResult.data ?? [];
    const storeIds = [...new Set(recentRows.map((visit) => visit.store_id))];
    const storeNames = new Map<string, string>();

    if (storeIds.length) {
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("id, name")
        .eq("client_id", clientId)
        .in("id", storeIds);

      if (storesError) {
        return emptyDashboard({
          client,
          role: membership.role,
          hasError: true,
        });
      }

      (stores ?? []).forEach((store) => storeNames.set(store.id, store.name));
    }

    return {
      client,
      role: membership.role,
      metrics: {
        totalVisits: visits.length,
        averageScore,
        nonconformities,
        reportsGenerated: generatedResult.count ?? 0,
        reportsSent: sentResult.count ?? 0,
      },
      recentVisits: recentRows.map((visit) => ({
        id: visit.id,
        storeName: storeNames.get(visit.store_id) ?? "Loja não identificada",
        score: visit.score,
        classification: visit.classification,
        occurredAt: visit.occurred_at,
        status: visit.status,
      })),
      needsOnboarding: false,
      hasError: false,
    };
  } catch {
    return emptyDashboard({ hasError: true });
  }
}

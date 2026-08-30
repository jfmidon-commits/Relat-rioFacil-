import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ManagedClient = {
  id: string;
  name: string;
  status: string;
  role: string;
  canManage: boolean;
};

export type ManagedStore = {
  id: string;
  clientId: string;
  name: string;
  address: string | null;
  isActive: boolean;
};

export type ManagementData = {
  clients: ManagedClient[];
  stores: ManagedStore[];
  hasError: boolean;
};

export async function getManagementData(): Promise<ManagementData> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { clients: [], stores: [], hasError: true };
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("client_memberships")
      .select("client_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (membershipsError) {
      return { clients: [], stores: [], hasError: true };
    }

    const membershipRows = memberships ?? [];
    const clientIds = membershipRows.map((membership) => membership.client_id);

    if (!clientIds.length) {
      return { clients: [], stores: [], hasError: false };
    }

    const roleByClient = new Map(
      membershipRows.map((membership) => [membership.client_id, membership.role]),
    );

    const [clientsResult, storesResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, status")
        .in("id", clientIds)
        .order("name", { ascending: true }),
      supabase
        .from("stores")
        .select("id, client_id, name, address, is_active")
        .in("client_id", clientIds)
        .order("name", { ascending: true }),
    ]);

    if (clientsResult.error || storesResult.error) {
      return { clients: [], stores: [], hasError: true };
    }

    return {
      clients: (clientsResult.data ?? []).map((client) => {
        const role = roleByClient.get(client.id) ?? "member";
        return {
          id: client.id,
          name: client.name,
          status: client.status,
          role,
          canManage: role === "owner" || role === "admin",
        };
      }),
      stores: (storesResult.data ?? []).map((store) => ({
        id: store.id,
        clientId: store.client_id,
        name: store.name,
        address: store.address,
        isActive: store.is_active,
      })),
      hasError: false,
    };
  } catch {
    return { clients: [], stores: [], hasError: true };
  }
}

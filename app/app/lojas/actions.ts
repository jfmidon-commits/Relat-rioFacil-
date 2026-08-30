"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function getAuthorizedContext(clientId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership, error } = await supabase
    .from("client_memberships")
    .select("role")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const canManage =
    !error &&
    membership &&
    (membership.role === "owner" || membership.role === "admin");

  if (!canManage) {
    redirect("/app/lojas?error=forbidden");
  }

  return { supabase };
}

export async function createStoreAction(formData: FormData) {
  const clientId = readText(formData, "client_id", 80);
  const name = readText(formData, "name", 160);
  const address = readText(formData, "address", 500);

  if (!clientId || name.length < 2) {
    redirect("/app/lojas?error=invalid_data");
  }

  const { supabase } = await getAuthorizedContext(clientId);
  const { error } = await supabase.from("stores").insert({
    client_id: clientId,
    name,
    address: address || null,
    is_active: true,
  });

  if (error) {
    redirect(`/app/lojas?client=${encodeURIComponent(clientId)}&error=create_failed`);
  }

  revalidatePath("/app");
  revalidatePath("/app/lojas");
  redirect(`/app/lojas?client=${encodeURIComponent(clientId)}&ok=created`);
}

export async function updateStoreAction(formData: FormData) {
  const storeId = readText(formData, "store_id", 80);
  const clientId = readText(formData, "client_id", 80);
  const name = readText(formData, "name", 160);
  const address = readText(formData, "address", 500);
  const isActive = formData.get("is_active") === "on";

  if (!storeId || !clientId || name.length < 2) {
    redirect("/app/lojas?error=invalid_data");
  }

  const { supabase } = await getAuthorizedContext(clientId);
  const { data: updated, error } = await supabase
    .from("stores")
    .update({
      name,
      address: address || null,
      is_active: isActive,
    })
    .eq("id", storeId)
    .eq("client_id", clientId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    redirect(`/app/lojas?client=${encodeURIComponent(clientId)}&error=update_failed`);
  }

  revalidatePath("/app");
  revalidatePath("/app/lojas");
  redirect(`/app/lojas?client=${encodeURIComponent(clientId)}&ok=updated`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createClientAction(formData: FormData) {
  const name = readText(formData, "name", 160);

  if (name.length < 2) {
    redirect("/app/clientes?error=invalid_name");
  }

  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("clients").insert({
    name,
    created_by: user.id,
    status: "active",
  });

  if (error) {
    redirect("/app/clientes?error=create_failed");
  }

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  revalidatePath("/app/lojas");
  redirect("/app/clientes?ok=created");
}

export async function updateClientAction(formData: FormData) {
  const clientId = readText(formData, "client_id", 80);
  const name = readText(formData, "name", 160);
  const rawStatus = readText(formData, "status", 20);
  const status = rawStatus === "paused" ? "paused" : "active";

  if (!clientId || name.length < 2) {
    redirect("/app/clientes?error=invalid_data");
  }

  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("client_memberships")
    .select("role")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    (membership.role !== "owner" && membership.role !== "admin")
  ) {
    redirect("/app/clientes?error=forbidden");
  }

  const { data: updated, error } = await supabase
    .from("clients")
    .update({ name, status })
    .eq("id", clientId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    redirect("/app/clientes?error=update_failed");
  }

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  revalidatePath("/app/lojas");
  redirect("/app/clientes?ok=updated");
}

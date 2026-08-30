"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAirtableImport } from "@/lib/services/airtable-import";

function readClientId(formData: FormData) {
  const value = formData.get("client_id");
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export async function importAirtableAction(formData: FormData) {
  const clientId = readClientId(formData);
  if (!clientId) redirect("/app/importar?error=invalid_client");

  const result = await runAirtableImport(clientId);
  const base = `/app/importar?client=${encodeURIComponent(clientId)}`;

  if (!result.ok) {
    redirect(`${base}&error=${encodeURIComponent(result.errorCode ?? "import_failed")}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/visitas");
  revalidatePath("/app/relatorios");
  revalidatePath("/app/importar");

  redirect(
    `${base}&ok=imported&new=${result.imported}&updated=${result.updated}&skipped=${result.skipped}`,
  );
}

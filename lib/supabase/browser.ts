import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase Auth ainda não foi configurado neste ambiente.");
  }

  return createBrowserClient(url, anonKey);
}

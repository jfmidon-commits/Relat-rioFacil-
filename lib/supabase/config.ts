export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const legacyAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonKey = publishableKey ?? legacyAnonKey;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

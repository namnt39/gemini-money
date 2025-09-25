import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseClientType = SupabaseClient | null;

let client: SupabaseClientType = null;
let configurationError: Error | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  const missingEnvVars = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
  ].filter(Boolean);

  configurationError = new Error(
    `Missing Supabase environment variables: ${missingEnvVars.join(", ")}`
  );

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[Supabase] Falling back to safe defaults because ${configurationError.message}.`
    );
  }
}

export const supabase = client;
export const supabaseConfigurationError = configurationError;
export const isSupabaseConfigured = client !== null;

export function requireSupabaseClient() {
  if (!client) {
    throw configurationError ?? new Error("Supabase client is not configured.");
  }
  return client;
}

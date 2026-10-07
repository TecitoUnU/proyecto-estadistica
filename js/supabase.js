import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (!SUPABASE_URL || SUPABASE_URL.includes("TU-PROYECTO") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "TU_ANON_KEY") {
  console.warn("Configure SUPABASE_URL y SUPABASE_ANON_KEY en js/config.js");
}

/** Cliente público. Solo anon key; nunca service_role. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAdminProfile() {
  const session = await getSession();
  if (!session?.user) return { session: null, profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return { session, profile };
}

export async function requireAdmin() {
  const { session, profile } = await getAdminProfile();
  if (!session || profile?.role !== "admin") {
    await supabase.auth.signOut();
    return null;
  }
  return { session, profile };
}

export async function signOut() {
  await supabase.auth.signOut();
}

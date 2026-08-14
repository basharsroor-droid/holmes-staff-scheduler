import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not configured");
  const { supabaseUrl } = getSupabaseConfig();
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

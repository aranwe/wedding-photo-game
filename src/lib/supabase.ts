"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy browser-only client. Creating it at module scope would evaluate during
 * the build (static prerender of "/"), before NEXT_PUBLIC_* values exist.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});


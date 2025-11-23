"use client";

import { createClient } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient = null;

function resolveWindowEnv(name) {
  if (typeof window === "undefined" || !window.__env) return undefined;
  return window.__env[name];
}

function getEnvValue(name) {
  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    return PUBLIC_SUPABASE_URL ?? resolveWindowEnv(name);
  }
  if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
    return PUBLIC_SUPABASE_ANON_KEY ?? resolveWindowEnv(name);
  }
  return resolveWindowEnv(name);
}

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;

  const url = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: "dinnerdecider-sb-auth",
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  });

  return browserClient;
}

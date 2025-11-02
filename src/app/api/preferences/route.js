import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { cache: "no-store", ...init }) },
  });
}

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ likes: [], dislikes: [], source: "no_supabase" }, { status: 200 });
  }

  const { data, error } = await client
    .from("user_prefs")
    .select("likes, dislikes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("preferences_fetch_error", error);
    return NextResponse.json({ likes: [], dislikes: [], source: "error" }, { status: 200 });
  }

  return NextResponse.json({
    likes: Array.isArray(data?.likes) ? data.likes : [],
    dislikes: Array.isArray(data?.dislikes) ? data.dislikes : [],
    source: "supabase",
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.userId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const likes = Array.isArray(body.likes) ? body.likes.map(String) : [];
  const dislikes = Array.isArray(body.dislikes) ? body.dislikes.map(String) : [];

  const payload = {
    user_id: body.userId,
    likes,
    dislikes,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("user_prefs")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("preferences_upsert_error", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ likes, dislikes, source: "supabase" }, { status: 200 });
}

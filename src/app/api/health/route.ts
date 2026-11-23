import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number; details?: string }> = {};

  const startDb = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").select("id").limit(1).single();
    if (error) throw error;
    checks.database = { status: "ok", latencyMs: Date.now() - startDb };
  } catch (e) {
    checks.database = { status: "down", latencyMs: Date.now() - startDb, details: e instanceof Error ? e.message : "Unknown error" };
  }

  const startAuth = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    if (error && error.message !== "Auth session missing!") throw error;
    checks.auth = { status: "ok", latencyMs: Date.now() - startAuth };
  } catch (e) {
    checks.auth = { status: "degraded", latencyMs: Date.now() - startAuth, details: e instanceof Error ? e.message : "Unknown error" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const anyDown = Object.values(checks).some((c) => c.status === "down");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : anyDown ? "unhealthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: anyDown ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
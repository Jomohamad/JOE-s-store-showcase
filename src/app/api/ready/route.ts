import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const failures: string[] = [];

  try {
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("categories").select("id").limit(1).single();
    if (dbError) failures.push(`database: ${dbError.message}`);
  } catch (e) {
    failures.push(`database: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    if (authError && authError.message !== "Auth session missing!") failures.push(`auth: ${authError.message}`);
  } catch (e) {
    failures.push(`auth: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !resendFrom) {
    failures.push("email: RESEND_API_KEY or RESEND_FROM_EMAIL not configured");
  }

  const paymentProvider = process.env.PAYMENT_PROVIDER;
  if (!paymentProvider || paymentProvider === "mock") {
    failures.push("payment: PAYMENT_PROVIDER not configured or set to mock");
  }

  const ready = failures.length === 0;

  return NextResponse.json(
    {
      ready,
      timestamp: new Date().toISOString(),
      checks: {
        database: failures.some((f) => f.startsWith("database:")) ? "fail" : "pass",
        auth: failures.some((f) => f.startsWith("auth:")) ? "fail" : "pass",
        email: failures.some((f) => f.startsWith("email:")) ? "fail" : "pass",
        payment: failures.some((f) => f.startsWith("payment:")) ? "fail" : "pass",
      },
      failures: ready ? [] : failures,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
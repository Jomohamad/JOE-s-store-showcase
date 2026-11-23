import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  // Handle OAuth provider errors (e.g., user denied consent)
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(new URL(destination, request.url));
    }

    console.error("Failed to exchange code for session:", exchangeError);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
    );
  }

  // No code parameter - this shouldn't happen in normal flow
  return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
}
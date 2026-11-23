"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
      if (authError) throw authError;
      window.location.assign(safeNext());
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign in."); setBusy(false); }
  }
  async function google() {
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}` } });
      if (authError) throw authError;
    } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in is unavailable."); setBusy(false); }
  }
  async function passkey() {
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPasskey();
      if (authError) throw authError;
      window.location.assign(safeNext());
    } catch (err) { setError(err instanceof Error ? err.message : "Passkey sign-in is unavailable."); setBusy(false); }
  }
  async function resetPassword() {
    const email = (document.querySelector<HTMLInputElement>("input[name=email]")?.value ?? "").trim();
    if (!email) { setError("Enter your email address first."); return; }
    setError(""); setMessage("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
      if (authError) throw authError;
      setMessage("If an account exists for this email, a password reset link is on its way.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send a reset link."); }
  }
  return <main className="wrap flex min-h-[65vh] items-center justify-center py-14"><form onSubmit={submit} className="panel relative w-full max-w-md overflow-hidden rounded-xl border border-[#55c8f544] p-7 shadow-[0_24px_80px_#0008] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-transparent before:via-[#55c8f5] before:to-transparent">
    <p className="eyebrow">WELCOME BACK, PLAYER</p><h1 className="mt-2 font-display text-3xl font-bold">Sign in</h1>
    <label className="mt-6 block text-xs text-[#aab1bd]">Email<input required name="email" type="email" autoComplete="email" className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/></label>
    <label className="mt-4 block text-xs text-[#aab1bd]">Password<input required name="password" type="password" autoComplete="current-password" className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/></label>
    <button type="button" onClick={() => void resetPassword()} className="mt-3 text-xs text-[#55c8f5]">Forgot password?</button>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-[#55c8f5]">{message}</p>}
    <button disabled={busy} className="lime-button mt-6 w-full py-3">{busy ? "Signing in…" : "Sign in"}</button>
    <div className="my-5 flex items-center gap-3 text-[10px] text-[#737c89]"><span className="h-px flex-1 bg-[#303643]"/>OR<span className="h-px flex-1 bg-[#303643]"/></div>
    <button type="button" disabled={busy} onClick={() => void google()} className="outline-button w-full py-3 text-sm">Continue with Google</button>
    <button type="button" disabled={busy} onClick={() => void passkey()} className="outline-button mt-3 w-full py-3 text-sm">Sign in with a passkey</button>
    <p className="mt-5 text-center text-sm text-[#a4acb8]">New to JOE Store? <a href="/register" className="text-[#55c8f5]">Create an account</a></p>
  </form></main>;
}

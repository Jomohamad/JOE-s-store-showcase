"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Register() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword,setShowPassword]=useState(false); const [showConfirm,setShowConfirm]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirmPassword) { setError("Your passwords do not match."); return; }
    if (!/(?=.{12,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)) { setError("Use 12–128 characters with uppercase, lowercase, a number, and a symbol."); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: String(form.get("email")), password,
        options: { data: { display_name: String(form.get("name")) }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      });
      if (authError) throw authError;
      if (data.session) window.location.assign("/account");
      else setMessage("Check your email to confirm your account, then sign in.");
    } catch (err) { setError(err instanceof Error ? err.message : "Registration failed."); }
    finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` } });
      if (authError) throw authError;
    } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in is unavailable."); setBusy(false); }
  }
  return <main className="wrap flex min-h-[65vh] items-center justify-center py-14"><form onSubmit={submit} className="panel relative w-full max-w-md overflow-hidden rounded-xl border border-[#55c8f544] p-7 shadow-[0_24px_80px_#0008] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-transparent before:via-[#55c8f5] before:to-transparent">
    <p className="eyebrow">JOIN THE LOBBY</p><h1 className="mt-2 font-display text-3xl font-bold">Create your account</h1>
    <label className="mt-6 block text-xs text-[#aab1bd]">Name<input required minLength={2} maxLength={80} name="name" autoComplete="name" className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/></label>
    <label className="mt-4 block text-xs text-[#aab1bd]">Email<input required type="email" name="email" autoComplete="email" className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/></label>
    <label className="mt-4 block text-xs text-[#aab1bd]">Password<input required minLength={12} maxLength={128} type={showPassword?"text":"password"} name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="mt-2 text-xs text-[#55c8f5]">{showPassword?"Hide password":"Show password"}</button><span className="mt-1 block text-[10px] text-[#848c99]">Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol.</span></label>
    <label className="mt-4 block text-xs text-[#aab1bd]">Confirm password<input required minLength={12} maxLength={128} type={showConfirm?"text":"password"} name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded border border-[#333a47] bg-[#0a0d13] p-3 text-sm outline-none focus:border-[#55c8f5]"/><button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="mt-2 text-xs text-[#55c8f5]">{showConfirm?"Hide password":"Show password"}</button></label>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-[#55c8f5]">{message}</p>}
    <button disabled={busy} className="lime-button mt-6 w-full py-3">{busy ? "Creating account…" : "Create account"}</button>
    <div className="my-5 flex items-center gap-3 text-[10px] text-[#737c89]"><span className="h-px flex-1 bg-[#303643]"/>OR<span className="h-px flex-1 bg-[#303643]"/></div>
    <button type="button" disabled={busy} onClick={() => void google()} className="outline-button w-full py-3 text-sm">Continue with Google</button>
    <p className="mt-5 text-center text-sm text-[#a4acb8]">Already a member? <a href="/login" className="text-[#55c8f5]">Sign in</a></p>
  </form></main>;
}

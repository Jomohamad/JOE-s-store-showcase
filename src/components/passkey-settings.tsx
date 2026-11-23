"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

function passkeyOriginMessage() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return "Passkeys are unavailable because the site's canonical URL is not configured.";
  try {
    const expected = new URL(configured).origin;
    return window.location.origin === expected ? "" : `Passkeys are configured for ${expected}. Open that address to manage passkeys.`;
  } catch { return "Passkeys are unavailable because the site's canonical URL is invalid."; }
}

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const originMessage = passkeyOriginMessage();
    if (originMessage) { setError(originMessage); setPasskeys([]); return; }
    const { data, error: listError } = await createClient().auth.passkey.list();
    if (listError) throw listError;
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load passkeys."));
  }, [refresh]);

  async function addPasskey() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: registerError } = await createClient().auth.registerPasskey();
      if (registerError) throw registerError;
      setMessage(`${data.friendly_name || "Passkey"} added.`);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not register a passkey."); }
    finally { setBusy(false); }
  }

  async function removePasskey(passkeyId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: deleteError } = await createClient().auth.passkey.delete({ passkeyId });
      if (deleteError) throw deleteError;
      setMessage("Passkey removed.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove this passkey."); }
    finally { setBusy(false); }
  }

  return <section className="panel mt-8 rounded-lg p-5" aria-labelledby="passkey-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">ACCOUNT SECURITY</p><h2 id="passkey-heading" className="mt-2 font-display text-xl font-bold">Passkeys</h2><p className="mt-1 text-sm text-[#9299a8]">Use your device biometrics or security key to sign in.</p></div>
      <button type="button" disabled={busy} onClick={() => void addPasskey()} className="lime-button px-4 py-2 text-sm">{busy ? "Working…" : "Add a passkey"}</button>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mt-4 text-sm text-[#55c8f5]">{message}</p>}
    <ul className="mt-4 divide-y divide-[#303643]">{passkeys.map((passkey) => <li key={passkey.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{passkey.friendly_name || "Passkey"}<span className="ml-2 text-xs text-[#9299a8]">Added {new Date(passkey.created_at).toLocaleDateString()}</span></span><button type="button" disabled={busy} onClick={() => void removePasskey(passkey.id)} className="text-xs text-red-300 underline">Remove</button></li>)}</ul>
    {!passkeys.length && !error && <p className="mt-3 text-sm text-[#9299a8]">No passkeys registered yet.</p>}
  </section>;
}

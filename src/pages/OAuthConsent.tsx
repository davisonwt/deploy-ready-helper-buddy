import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Minimal typed wrapper — supabase.auth.oauth is currently beta and not in the
// generated types. We only use these three methods.
type OAuthAuthorizationClient = { name?: string | null } | null;
type OAuthAuthorizationDetails = {
  client?: OAuthAuthorizationClient;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult = { data: OAuthAuthorizationDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const api = oauthApi();
      if (!api) {
        return setError(
          "OAuth 2.1 is not enabled on this Supabase project yet. Ask the app owner to enable OAuth 2.1 (Authentication → OAuth) in the Supabase dashboard.",
        );
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }

      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = oauthApi();
    if (!api) return;
    setBusy(true);
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg">
          <h1 className="text-xl font-semibold mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-sm text-muted-foreground">Loading authorization request…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg space-y-4">
        <h1 className="text-xl font-semibold">
          Connect {clientName} to your Sow2Grow account
        </h1>
        <p className="text-sm text-muted-foreground">
          This lets {clientName} use Sow2Grow tools as you. You can revoke access
          at any time.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 font-medium disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-border py-2 font-medium disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}

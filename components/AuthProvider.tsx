"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { LoaderCircle, LogIn, Mail, UserRound, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { anonymousDisplayName } from "@/lib/identity";
import { getVisitorId } from "@/lib/visitor";

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  session: Session | null;
  displayName: string;
  isAnonymous: boolean;
  openAccount: () => void;
  closeAccount: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function userDisplayName(user: User | null, fallbackSeed: string) {
  if (!user || user.is_anonymous) return anonymousDisplayName(user?.id || fallbackSeed || "guest");
  const metadataName = [user.user_metadata?.display_name, user.user_metadata?.full_name, user.user_metadata?.name]
    .find((value) => typeof value === "string" && value.trim());
  if (typeof metadataName === "string") return metadataName.trim();
  if (user.email) return user.email.split("@")[0] || "Registered user";
  return "Registered user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [anonymousSeed, setAnonymousSeed] = useState("guest");
  const [accountOpen, setAccountOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAnonymousSeed(getVisitorId() || "guest");
    const client = getSupabaseBrowser();
    if (!client) {
      setReady(true);
      return;
    }

    let mounted = true;
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    void (async () => {
      const { data } = await client.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        setSession(data.session);
        setReady(true);
        return;
      }

      const { data: anonymousData, error } = await client.auth.signInAnonymously();
      if (!mounted) return;
      if (error) setAuthError("Anonymous access is temporarily unavailable.");
      setSession(anonymousData.session || null);
      setReady(true);
    })();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user || null;
  const displayName = useMemo(() => userDisplayName(user, anonymousSeed), [user, anonymousSeed]);
  const isAnonymous = !user || Boolean(user.is_anonymous);

  async function requestMagicLink() {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const client = getSupabaseBrowser();
    if (!client) {
      setAuthError("Login is not available right now.");
      return;
    }

    setSending(true);
    setAuthError("");
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setSending(false);

    if (error) {
      setAuthError(error.message);
      return;
    }
    setMessage("Login link sent. Check your email.");
  }

  async function returnToAnonymous() {
    const client = getSupabaseBrowser();
    if (!client) return;
    setSending(true);
    setAuthError("");
    setMessage("");
    await client.auth.signOut();
    const { error } = await client.auth.signInAnonymously();
    if (error) setAuthError(error.message);
    setSending(false);
  }

  const value: AuthContextValue = {
    ready,
    user,
    session,
    displayName,
    isAnonymous,
    openAccount: () => setAccountOpen(true),
    closeAccount: () => setAccountOpen(false),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {accountOpen ? (
        <div className="accountBackdrop" onMouseDown={(e) => e.target === e.currentTarget && setAccountOpen(false)}>
          <section className="accountPanel" role="dialog" aria-modal="true" aria-label="Bheda account">
            <button className="accountClose" onClick={() => setAccountOpen(false)} aria-label="Close account panel"><X size={20} /></button>
            <div className="accountIcon"><UserRound size={28} /></div>
            <span className="eyebrow">Your account</span>
            <h2>{displayName}</h2>
            <p className="accountIntro">
              {isAnonymous
                ? `You are posting as ${displayName}. The random ID stays consistent on this account so conversations make sense without showing your identity.`
                : `Signed in${user?.email ? ` as ${user.email}` : ""}.`}
            </p>

            {authError ? <div className="formError">{authError}</div> : null}
            {message ? <div className="authSuccess">{message}</div> : null}

            {isAnonymous ? (
              <div className="authForm">
                <label>Email login
                  <div className="authInputRow">
                    <Mail size={18} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </label>
                <button className="authPrimary" onClick={requestMagicLink} disabled={sending || !email.trim()}>
                  {sending ? <LoaderCircle className="spin" size={18} /> : <LogIn size={18} />}
                  Email me a login link
                </button>
              </div>
            ) : (
              <button className="authSecondary" onClick={returnToAnonymous} disabled={sending}>
                {sending ? <LoaderCircle className="spin" size={18} /> : null}
                Sign out and continue anonymously
              </button>
            )}

            <p className="authNote">Posts and comments show your account name or your anonymous random ID.</p>
          </section>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

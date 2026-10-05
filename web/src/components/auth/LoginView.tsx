"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";

/** iPhone, iPad (iPadOS says "Macintosh") or the home-screen app. */
function prefersRedirect(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || standalone;
}

function errorCode(err: unknown): string {
  return (err as { code?: string })?.code ?? "";
}

function signInMessage(err: unknown): string | null {
  switch (errorCode(err)) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The sign-in window closed. Please try again.";
    case "auth/network-request-failed":
      return "No network connection. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not allowed to sign in.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

type LoginViewProps = {
  appName: string;
  subtitle?: string;
  className?: string;
};

export function LoginView({ appName, subtitle, className }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back from a redirect sign-in: success goes through onAuthStateChanged in
  // LoginClientPage, only errors need showing here.
  useEffect(() => {
    getRedirectResult(getFirebaseAuth()).catch((err) => {
      console.warn("[auth] redirect result failed", err);
      setError(signInMessage(err));
    });
  }, []);

  const onGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    // Redirect only works when the auth handler is on this same domain
    // (see rewrites in next.config.ts); otherwise Safari loses the result.
    const sameDomainHandler = auth.config.authDomain === window.location.host;
    try {
      if (sameDomainHandler && prefersRedirect()) {
        await signInWithRedirect(auth, provider);
        return; // the page navigates away
      }
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = errorCode(err);
      if (sameDomainHandler && code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(signInMessage(redirectErr));
        }
      } else {
        setError(signInMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Same login screen as every ws/app app (after hodi): icon, name, one short
  // line, one outlined "Continue with Google" button. No Google logo.
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col items-center justify-center gap-8 bg-background px-5 pb-[12dvh] text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Image src="/branding/cogi-icon.svg" alt="" width={40} height={40} />
        <div>
          <h1 className="text-xl font-medium tracking-tight text-foreground">{appName}</h1>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onGoogleSignIn()}
        disabled={loading}
        className="w-full max-w-xs rounded-full border border-border px-4 py-3 text-sm text-foreground transition-colors hover:bg-foreground/[0.06] disabled:opacity-40"
      >
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      {error ? (
        <p role="alert" className="max-w-xs text-sm text-muted-foreground">
          {error}
        </p>
      ) : null}
    </main>
  );
}

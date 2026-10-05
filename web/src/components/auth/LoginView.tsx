"use client";

import { useState } from "react";
import Image from "next/image";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { cn } from "@/lib/utils";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";

type LoginViewProps = {
  appName: string;
  subtitle?: string;
  className?: string;
};

export function LoginView({ appName, subtitle, className }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
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

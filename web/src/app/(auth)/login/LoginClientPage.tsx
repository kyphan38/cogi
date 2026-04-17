"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { LoginView } from "@/components/auth/LoginView";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { hasAllowlistConfig, isAllowedUser } from "@/lib/auth/allowed-user";

export function LoginClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncServerSession = useCallback(async (idToken: string | null) => {
    const method = idToken ? "POST" : "DELETE";
    try {
      await fetch("/api/auth/session", {
        method,
        headers: idToken ? { "Content-Type": "application/json" } : undefined,
        body: idToken ? JSON.stringify({ idToken }) : undefined,
      });
    } catch {
      // best-effort cookie sync
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await syncServerSession(null);
        return;
      }

      if (!hasAllowlistConfig()) {
        const idToken = await user.getIdToken();
        await syncServerSession(idToken);
        router.replace(searchParams.get("next") || "/dashboard");
        return;
      }
      if (!isAllowedUser(user)) return;
      const idToken = await user.getIdToken();
      await syncServerSession(idToken);
      const next = searchParams.get("next");
      const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(destination);
    });
    return () => unsub();
  }, [router, searchParams, syncServerSession]);

  return <LoginView appName="Cogi" subtitle="Thinking practice" />;
}

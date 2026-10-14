"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { LoginView } from "@/components/auth/LoginView";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { hasAllowlistConfig, isAllowedUser } from "@/lib/auth/allowed-user";
import { awaitRouterReplace } from "@/lib/nav/await-router-replace";

function isAbortError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    (e as { name: string }).name === "AbortError"
  );
}

export function LoginClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authListenerEpoch = useRef(0);
  const [sessionError, setSessionError] = useState<string | null>(null);

  /** Returns true when the server cookie is in place (always true for sign-out). */
  const syncServerSession = useCallback(async (idToken: string | null) => {
    const method = idToken ? "POST" : "DELETE";
    try {
      const res = await fetch("/api/auth/session", {
        method,
        headers: idToken ? { "Content-Type": "application/json" } : undefined,
        body: idToken ? JSON.stringify({ idToken }) : undefined,
      });
      if (!res.ok && idToken) {
        console.error("[LoginClientPage] session sync failed", res.status);
        return false;
      }
      return true;
    } catch (e) {
      if (isAbortError(e)) return true;
      return !idToken;
    }
  }, []);

  useEffect(() => {
    const epoch = ++authListenerEpoch.current;
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      void (async () => {
        try {
          if (!user) {
            await syncServerSession(null);
            return;
          }

          if (!hasAllowlistConfig()) {
            const idToken = await user.getIdToken();
            const ok = await syncServerSession(idToken);
            if (epoch !== authListenerEpoch.current) return;
            if (!ok) {
              setSessionError("Signed in, but the server could not start your session. Please try again.");
              return;
            }
            await awaitRouterReplace(router, searchParams.get("next") || "/");
            return;
          }
          if (!isAllowedUser(user)) return;
          const idToken = await user.getIdToken();
          const ok = await syncServerSession(idToken);
          if (epoch !== authListenerEpoch.current) return;
          if (!ok) {
            setSessionError("Signed in, but the server could not start your session. Please try again.");
            return;
          }
          const next = searchParams.get("next");
          const destination =
            next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
          await awaitRouterReplace(router, destination);
        } catch (e) {
          if (isAbortError(e)) return;
          console.error("[LoginClientPage] onAuthStateChanged", e);
        }
      })().catch((e) => {
        if (isAbortError(e)) return;
        console.error("[LoginClientPage] onAuthStateChanged (async)", e);
      });
    });
    return () => {
      unsub();
      authListenerEpoch.current++;
    };
  }, [router, searchParams, syncServerSession]);

  return <LoginView appName="cogi" subtitle="Short daily thinking practice." externalError={sessionError} />;
}

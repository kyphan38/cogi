"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/auth/firebase-client";
import { hasAllowlistConfig, isAllowedUser } from "@/lib/auth/allowed-user";

type FirebaseAuthGateProps = {
  children: React.ReactNode;
};

export function FirebaseAuthGate({ children }: FirebaseAuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const targetNext = useMemo(() => {
    if (!pathname || pathname === "/") return "";
    return `?next=${encodeURIComponent(pathname)}`;
  }, [pathname]);

  const syncServerSession = useCallback(async (idToken: string | null) => {
    const method = idToken ? "POST" : "DELETE";
    try {
      await fetch("/api/auth/session", {
        method,
        headers: idToken ? { "Content-Type": "application/json" } : undefined,
        body: idToken ? JSON.stringify({ idToken }) : undefined,
      });
    } catch {
      // Best-effort sync; middleware still checks bearer token for API requests.
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!hasAllowlistConfig()) {
        if (!user) {
          await syncServerSession(null);
          router.replace(`/login${targetNext}`);
          setStatus("loading");
          return;
        }
        const idToken = await user.getIdToken();
        await syncServerSession(idToken);
        setStatus("ready");
        return;
      }
      if (isAllowedUser(user)) {
        const idToken = await user?.getIdToken();
        await syncServerSession(idToken ?? null);
        setStatus("ready");
        return;
      }
      await syncServerSession(null);
      if (user) {
        await signOut(auth);
      }
      router.replace(`/login${targetNext}`);
      setStatus("loading");
    });
    return () => unsub();
  }, [router, syncServerSession, targetNext]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-sm text-muted-foreground">
        Checking access...
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readAiSecretFromStorage } from "@/lib/api/ai-client";

const PUBLIC_PATHS = new Set(["/login"]);

export function RequireAiSecret({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || PUBLIC_PATHS.has(pathname)) return;
    if (readAiSecretFromStorage()) return;
    const q = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${q}`);
  }, [pathname, router]);

  if (pathname && !PUBLIC_PATHS.has(pathname) && typeof window !== "undefined" && !readAiSecretFromStorage()) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}

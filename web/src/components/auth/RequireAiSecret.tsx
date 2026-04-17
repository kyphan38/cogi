"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readAiSecretFromStorage } from "@/lib/api/ai-client";

const PUBLIC_PATHS = new Set(["/login"]);

export function RequireAiSecret({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!pathname || PUBLIC_PATHS.has(pathname)) {
      setIsRedirecting(false);
      return;
    }
    const hasSecret = Boolean(readAiSecretFromStorage());
    if (hasSecret) {
      setIsRedirecting(false);
      return;
    }
    setIsRedirecting(true);
    const q = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${q}`);
  }, [pathname, router]);

  if (isRedirecting) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}

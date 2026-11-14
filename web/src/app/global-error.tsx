"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cogi] root error:", error.message, error.digest ?? "");
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground antialiased">
        <div className="max-w-md text-center">
          <h1 className="text-lead font-semibold">Something went wrong</h1>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="rounded-md bg-muted px-4 py-2 text-body font-medium text-foreground hover:bg-card"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-input px-4 py-2 text-body font-medium text-foreground hover:bg-primary/90"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}

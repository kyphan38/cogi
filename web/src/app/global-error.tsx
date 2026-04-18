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
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4 text-zinc-100 antialiased">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A critical error occurred. Try reloading or go home.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}

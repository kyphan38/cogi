"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AI_SECRET_STORAGE_KEY } from "@/lib/api/ai-secret-constants";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data.ok) {
        setError(
          "ok" in data && data.ok === false ? (data.error ?? "Sign in failed") : "Sign in failed",
        );
        return;
      }
      window.localStorage.setItem(AI_SECRET_STORAGE_KEY, password);
      const next = searchParams.get("next");
      const dest =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Sign in</CardTitle>
          <CardDescription>
            Enter the app password configured as <code className="text-xs">APP_API_SECRET</code>{" "}
            on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="app-password">Password</Label>
              <Input
                id="app-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="App password"
              />
            </div>
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-xs")}>
          Back to home
        </Link>{" "}
        (you may need to sign in to use AI features.)
      </p>
    </div>
  );
}

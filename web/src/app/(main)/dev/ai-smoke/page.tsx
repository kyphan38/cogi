"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { aiFetch } from "@/lib/api/ai-fetch";

type ApiOk = { ok: true; data: unknown };
type ApiErr = {
  ok: false;
  error: string;
  rawSnippet?: string;
};
type ApiResponse = ApiOk | ApiErr;

export default function AiSmokePage() {
  const [domain, setDomain] = useState("DevOps / SRE");
  const [userContext, setUserContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function onGenerate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await aiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          userContext: userContext.trim() || undefined,
        }),
      });
      const json = (await res.json()) as ApiResponse;
      setResult(json);
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>AI smoke test</CardTitle>
          <CardDescription>
            Phase 0 - calls POST /api/ai (Gemini + Zod). Key stays server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. DevOps / SRE"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ctx">User context (optional)</Label>
            <Textarea
              id="ctx"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              rows={4}
              placeholder="Personal context for the prompt..."
            />
          </div>
          <Button type="button" disabled={loading} onClick={onGenerate}>
            {loading ? (
              <>
                <InlineSpinner /> Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && !result.ok && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{result.error}</p>
            {result.rawSnippet ? (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">
                {result.rawSnippet}
              </pre>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {result && result.ok && (
        <pre className="overflow-auto rounded-lg border bg-muted/40 p-4 text-sm">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

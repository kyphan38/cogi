import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PerspectiveLoadingCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Generating perspective…</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-[92%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-[86%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-[90%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-[80%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-[88%] animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}


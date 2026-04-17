import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AI_SECRET_HEADER } from "@/lib/api/ai-secret-constants";
import { timingSafeEqualString } from "@/lib/api/timing-safe-equal";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/ai")) {
    return NextResponse.next();
  }
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const expected = process.env.APP_API_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "APP_API_SECRET is not configured" },
      { status: 503 },
    );
  }

  const provided = request.headers.get(AI_SECRET_HEADER)?.trim() ?? "";
  if (!timingSafeEqualString(provided, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/ai", "/api/ai/:path*"],
};

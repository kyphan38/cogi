import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/api/timing-safe-equal";

export async function POST(req: Request) {
  const expected = process.env.APP_API_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "APP_API_SECRET is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be an object" }, { status: 400 });
  }

  const raw = (body as { password?: unknown }).password;
  if (typeof raw !== "string" || !raw) {
    return NextResponse.json(
      { ok: false, error: "password is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!timingSafeEqualString(raw, expected)) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

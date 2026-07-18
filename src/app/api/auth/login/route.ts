import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { backendUrl } from "@/lib/auth/backend";
import { applyAuthCookies, buildAuthCookies } from "@/lib/auth/cookies";
import type { TokenPair } from "@/lib/auth/types";

interface ParsedLogin {
  email: string;
  password: string;
  remember: boolean;
}

function parseLoginBody(data: unknown): ParsedLogin | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.email !== "string" || d.email.trim() === "") return null;
  if (typeof d.password !== "string" || d.password === "") return null;
  return { email: d.email, password: d.password, remember: d.remember === true };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }
  let base: string;
  try {
    base = backendUrl();
  } catch {
    return NextResponse.json({ ok: false, code: "misconfigured" }, { status: 500 });
  }
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const parsed = parseLoginBody(data);
  if (!parsed) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  let backendRes: Response;
  try {
    backendRes = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: parsed.email, password: parsed.password }),
    });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }
  if (!backendRes.ok) {
    // Ham backend mesajini sizdirma; yalniz statuyu gecir.
    return NextResponse.json({ ok: false, code: "invalid_credentials" }, { status: backendRes.status });
  }
  const pair = (await backendRes.json()) as TokenPair;
  const res = NextResponse.json({ ok: true });
  applyAuthCookies(res, buildAuthCookies(pair, parsed.remember));
  return res;
}

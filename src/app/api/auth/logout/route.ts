import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { applyAuthCookies, clearedAuthCookies } from "@/lib/auth/cookies";

// Backend logout no-op (token'lar stateless). Oturumu bitirmek = cookie'yi silmek.
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }
  const res = new NextResponse(null, { status: 204 });
  applyAuthCookies(res, clearedAuthCookies());
  return res;
}

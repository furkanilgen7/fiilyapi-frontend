import type { TokenPair } from "./types";

export interface ProxyResult {
  status: number;
  body: unknown;
  // Seffaf refresh olduysa yeni access token — cagiran taraf access cookie'sini gunceller.
  refreshedAccessToken?: string;
}

export interface ProxyOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
}

export function backendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error("BACKEND_URL tanimli degil");
  return url;
}

async function parseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function buildUrl(path: string, query: Record<string, string> | undefined): string {
  if (!query || Object.keys(query).length === 0) return backendUrl() + path;
  const qs = new URLSearchParams(query).toString();
  return backendUrl() + path + "?" + qs;
}

// Backend'e Bearer ile tek istek — method/body/query destekli.
function request(path: string, accessToken: string | undefined, options: ProxyOptions): Promise<Response> {
  const { method = "GET", body, query } = options;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return fetch(buildUrl(path, query), init);
}

// Backend'i Bearer ile cagirir; 401'de refresh token varsa /auth/refresh dener,
// basarili ise yeni access token ile AYNI method+body+query ile bir kez retry eder.
export async function proxyAuthenticated(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  path: string,
  options: ProxyOptions = {},
): Promise<ProxyResult> {
  const first = await request(path, accessToken, options);
  if (first.status !== 401) {
    return { status: first.status, body: await parseBody(first) };
  }
  if (!refreshToken) {
    return { status: 401, body: await parseBody(first) };
  }
  const refreshed = await fetch(backendUrl() + "/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!refreshed.ok) {
    return { status: 401, body: null };
  }
  const pair = (await parseBody(refreshed)) as TokenPair | null;
  if (!pair?.access_token) {
    return { status: 401, body: null };
  }
  const retry = await request(path, pair.access_token, options);
  return {
    status: retry.status,
    body: await parseBody(retry),
    refreshedAccessToken: pair.access_token,
  };
}

import type { TokenPair } from "./types";

export interface ProxyResult {
  status: number;
  body: unknown;
  // Seffaf refresh olduysa yeni access token — cagiran taraf access cookie'sini gunceller.
  refreshedAccessToken?: string;
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

function get(path: string, accessToken: string | undefined): Promise<Response> {
  return fetch(backendUrl() + path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

// Backend'i Bearer ile cagirir; 401'de refresh token varsa /auth/refresh dener,
// basarili ise yeni access token ile bir kez retry eder. Refresh token (stateless,
// backend'de rotasyonsuz) tarayicida yenilenmez — yalniz access cookie'si guncellenir.
export async function proxyAuthenticated(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  path: string,
): Promise<ProxyResult> {
  const first = await get(path, accessToken);
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
  const retry = await get(path, pair.access_token);
  return {
    status: retry.status,
    body: await parseBody(retry),
    refreshedAccessToken: pair.access_token,
  };
}

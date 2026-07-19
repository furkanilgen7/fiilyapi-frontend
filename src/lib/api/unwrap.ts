// BFF/backend hatalarini tasiyan tip — status'a gore ekranlar ( or. 403) dallanir.
export class BackendError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`backend hatasi: ${status}`);
    this.name = "BackendError";
    this.status = status;
    this.body = body;
  }
}

// openapi-fetch sonucunu cozer: 2xx ise data, degilse BackendError firlatir.
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.response.ok) {
    return result.data as T;
  }
  throw new BackendError(result.response.status, result.error);
}

export function isForbidden(err: unknown): boolean {
  return err instanceof BackendError && err.status === 403;
}

import type { components } from "@/lib/api/schema";

// Backend sozlesmesinden turetilen auth tipleri (openapi.json DONMUS).
export type TokenPair = components["schemas"]["TokenPair"];
export type MeResponse = components["schemas"]["MeResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];

// Next cookie set secenekleriyle uyumlu cerez tanimi.
export interface CookieSpec {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
}

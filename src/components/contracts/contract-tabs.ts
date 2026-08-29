import type { ContractType } from "@/lib/api/hooks/useContracts";
import { routes } from "@/lib/routes";

/**
 * SZL sekme durumu URL'dedir (F-P5 T2 görev emri): paylaşılabilir olsun ve
 * geri/ileri tuşu çalışsın. İki sekme AYNI rotanın (`/sozlesmeler`) iki
 * görünümüdür — `/hakedisler` ↔ `/hakedisler/taseron` gibi İKİ AYRI ROTA
 * DEĞİL: `GET /contracts` tek uçtur, yalnız `type` parametresi değişir
 * (mockup 26-29'daki segment kontrolü de tek sayfa içindedir).
 *
 * Parametre adı ve değerleri backend enum'uyla BİREBİR (`employer` |
 * `subcontractor`) — araya Türkçe bir çeviri katmanı konmaz, sekme değeri
 * doğrudan `useContracts({ type })`e geçer.
 */
export const CONTRACT_TAB_PARAM = "type";

/** Mockup 27: "İşveren" sekmesi seçili başlar → varsayılan `employer`. */
export const DEFAULT_CONTRACT_TAB: ContractType = "employer";

export interface ContractTabParams {
  get(name: string): string | null;
}

export function parseContractTab(params: ContractTabParams | null): ContractType {
  return params?.get(CONTRACT_TAB_PARAM) === "subcontractor"
    ? "subcontractor"
    : DEFAULT_CONTRACT_TAB;
}

/**
 * Varsayılan sekmenin href'i parametresizdir — `/sozlesmeler` ile
 * `/sozlesmeler?type=employer` aynı ekranı gösterir, kanonik olan kısa
 * hâlidir (nav'daki link de odur).
 */
export function contractTabHref(tab: ContractType): string {
  return tab === DEFAULT_CONTRACT_TAB
    ? routes.contracts.list()
    : routes.contracts.list({ tabParam: CONTRACT_TAB_PARAM, tab });
}

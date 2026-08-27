/**
 * E14 sekme şeridi (mockup `Ekran 14 - Sözleşme Detay.dc.html` 90-95) —
 * dört sekme, sıra ve etiketler mockup'tan BİREBİR:
 * 91 "Genel" (seçili başlar) · 92 "İş Kalemleri" · 93 "Hakedişler" ·
 * 94 "Belgeler".
 *
 * Sekme durumu URL'dedir (T2'nin `contract-tabs.ts` deseniyle tutarlı):
 * paylaşılabilir olsun ve geri/ileri tuşu çalışsın. Dördü AYNI rotanın
 * (`/sozlesmeler/isveren/[projectId]`) dört görünümüdür — ayrı rota değil,
 * çünkü mockup 90-95 tek sayfa içindeki bir segment kontrolüdür.
 *
 * Parametre adı ve değerleri KOD dilindedir (repo kuralı: kod/isim İngilizce,
 * UI metni Türkçe); T2'de değerler backend enum'u olduğu için İngilizceydi,
 * burada backend karşılığı olmadığından aynı dil tercihi sürdürülür.
 */
export const EMPLOYER_CONTRACT_TAB_PARAM = "tab";

export type EmployerContractTab = "general" | "items" | "payments" | "documents";

/** Mockup 91: "Genel" sekmesi seçili başlar. */
export const DEFAULT_EMPLOYER_CONTRACT_TAB: EmployerContractTab = "general";

export const EMPLOYER_CONTRACT_TABS: readonly {
  value: EmployerContractTab;
  label: string;
}[] = [
  { value: "general", label: "Genel" }, // 91
  { value: "items", label: "İş Kalemleri" }, // 92
  { value: "payments", label: "Hakedişler" }, // 93
  { value: "documents", label: "Belgeler" }, // 94
];

const TAB_VALUES: readonly string[] = EMPLOYER_CONTRACT_TABS.map((tab) => tab.value);

export interface EmployerContractTabParams {
  get(name: string): string | null;
}

export function parseEmployerContractTab(
  params: EmployerContractTabParams | null,
): EmployerContractTab {
  const raw = params?.get(EMPLOYER_CONTRACT_TAB_PARAM);
  return raw !== null && raw !== undefined && TAB_VALUES.includes(raw)
    ? (raw as EmployerContractTab)
    : DEFAULT_EMPLOYER_CONTRACT_TAB;
}

/**
 * Temel rota — SZL satırının ("Detay →") hedefiyle birebir aynı.
 *
 * 🔴 F-PRJKALEM · `encodeURIComponent` ÖLÇÜLEREK EKLENDİ. Kurucu düz
 * interpolasyon yapıyordu; uygulamadaki öteki rota kurucularının HEPSİ
 * (`projectSummaryHref`, `/belgeler?proje=`, `/hakedisler?project_id=` …)
 * kimliği kodluyor. Bugünkü çağıranların hepsi UUID taşıdığı için fark
 * görünmüyordu — yani bu, davranışı bozmadan kapanan sessiz bir tutarsızlıktı.
 * Düzeltme ÇAĞIRANDA değil KURUCUDA yapılır: `employerContractTabHref` ve
 * `employerContractDistributionHref` de buradan türer, üç yerde ayrı ayrı
 * kodlamak aynı çürüme sınıfını üretirdi.
 */
export function employerContractHref(projectId: string): string {
  return `/sozlesmeler/isveren/${encodeURIComponent(projectId)}`;
}

/**
 * Varsayılan sekmenin href'i parametresizdir — `contractTabHref` ile aynı
 * kanonik-kısa-URL kuralı (listeden gelen link de o kısa hâle gider).
 */
export function employerContractTabHref(
  projectId: string,
  tab: EmployerContractTab,
): string {
  const base = employerContractHref(projectId);
  return tab === DEFAULT_EMPLOYER_CONTRACT_TAB
    ? base
    : `${base}?${EMPLOYER_CONTRACT_TAB_PARAM}=${tab}`;
}

/** POZ ekranı (T4'te yazılacak) — spec §1 rota tablosu. */
export function employerContractDistributionHref(projectId: string): string {
  return `${employerContractHref(projectId)}/poz-dagilimi`;
}

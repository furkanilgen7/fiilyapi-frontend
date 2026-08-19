import type { BadgeVariant } from "@/components/ui";
import type {
  FinancialInstrumentDirection,
  FinancialInstrumentKind,
  FinancialInstrumentStatus,
} from "@/lib/api/hooks/useFinancialInstruments";

/**
 * F-FIN · `Ekran 10 - Finans Çek Ödeme.dc.html` (E10) TÜREV katmanı.
 * Parantez içi sayılar O dosyanın SATIR numaralarıdır.
 *
 * Bu dosya SAF'tır (React yok): sekme→süzgeç çevrimi ve rozet üçlüsü burada
 * yaşar, bileşenlerde `if (status === ...)` YAZILMAZ.
 */

/** İzin matrisi anahtarı — FIN-1 uçlarının kapısı `treasury` iznidir. */
export const FINANCIAL_INSTRUMENT_PERMISSION_MODULE = "treasury";

/** E10:94-96 sekmeleri. URL parametresi değerleridir; `alinan` VARSAYILANDIR. */
export type InstrumentTabKey = "alinan" | "verilen" | "senet";

export interface InstrumentTab {
  key: InstrumentTabKey;
  label: string;
  /** E10 satır numarası — mockup izlenebilirliği. */
  line: number;
}

/** E10:94-96 — sıra mockup'ın sırasıdır (K2). */
export const INSTRUMENT_TABS: readonly InstrumentTab[] = [
  { key: "alinan", label: "Alınan Çekler", line: 94 },
  { key: "verilen", label: "Verilen Çekler", line: 95 },
  { key: "senet", label: "Senetler", line: 96 },
];

/**
 * 🔴 ÜÇ SEKME AYRI UÇ DEĞİLDİR — `direction` + `instrument_kind` SÜZGECİDİR
 * (openapi: "E10:96 `Senetler` SUZGECTIR, ayri uc DEGIL").
 *
 * `Senetler` sekmesi YÖN SÜZMEZ: senet hem alınmış hem verilmiş olabilir ve
 * mockup bu sekmeyi yöne bölmez. Yönü de süzseydik verilen senetler hiçbir
 * sekmede GÖRÜNMEZ, sessizce kaybolurdu.
 */
export function instrumentTabFilter(tab: InstrumentTabKey): {
  direction?: FinancialInstrumentDirection;
  instrumentKind: FinancialInstrumentKind;
} {
  if (tab === "senet") return { instrumentKind: "promissory_note" };
  return {
    direction: tab === "verilen" ? "issued" : "received",
    instrumentKind: "cheque",
  };
}

/** Tanınmayan URL değeri VARSAYILANA düşer (E10'da ilk sekme etkin). */
export function instrumentTabFromParam(value: string | null): InstrumentTabKey {
  return INSTRUMENT_TABS.some((tab) => tab.key === value)
    ? (value as InstrumentTabKey)
    : "alinan";
}

/**
 * Rozetin ÜÇ tonu (E10:121 · 130/139 · 157) + mockup'ta çizilmeyen dördüncü
 * hâl. Ton yalnız rozeti değil VADE hücresinin rengini de sürer (E10:106/115
 * turuncu · E10:124/133 yeşil · E10:151 nötr) — iki yüzey TEK türevden gelsin.
 */
export type InstrumentTone = "due" | "portfolio" | "settled" | "closed";

export interface InstrumentBadge {
  tone: InstrumentTone;
  label: string;
  variant: BadgeVariant;
}

/**
 * 🔴 K3 — `is_due` TÜREV, `status` KALICI. "Vadede" bir enum üyesi DEĞİLDİR
 * (`FinancialInstrumentStatus` beşlisinde YOKTUR, şema bunu açıkça yazar):
 * `status === "portfolio"` **ve** `is_due` bileşimidir. `status` alanını
 * "vadede" diye okumaya çalışan her kod yanlıştır.
 *
 * `is_due` yalnız portföydeki bir kıymet için anlamlıdır: tahsil edilmiş bir
 * çekin vadesi geçmiş olabilir ama o artık portföyde değildir ve E10:157'de
 * MAVİ "Tahsil Edildi" basar, turuncu DEĞİL.
 *
 * Mockup'ta çizilmeyen üç durum (`paid`/`returned`/`cancelled`) SESSİZCE
 * ATLANMAZ: dördüncü kart "İade / İptal" (E10:85-89) o kayıtların var
 * olduğunu söylüyor. Nötr tonla basılırlar — E10:88'in gri (`#64748b`)
 * kart rengiyle aynı aile.
 */
export function instrumentBadge(
  status: FinancialInstrumentStatus,
  isDue: boolean,
): InstrumentBadge {
  if (status === "portfolio") {
    return isDue
      ? { tone: "due", label: "Vadede", variant: "warning" } // E10:121, 148
      : { tone: "portfolio", label: "Portföyde", variant: "success" }; // E10:130, 139
  }
  if (status === "collected") {
    return { tone: "settled", label: "Tahsil Edildi", variant: "primary" }; // E10:157
  }
  if (status === "paid") return { tone: "settled", label: "Ödendi", variant: "primary" };
  if (status === "returned") return { tone: "closed", label: "İade", variant: "neutral" };
  return { tone: "closed", label: "İptal", variant: "neutral" };
}

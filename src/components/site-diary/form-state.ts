import type { SiteDiaryEntryDetail, Weather } from "@/lib/api/hooks/useSiteDiary";
import type {
  SiteDiaryEntryCreate,
  SiteDiaryEntryUpdate,
  SiteDiaryLinesSave,
} from "@/lib/api/hooks/useSiteDiaryMutations";

import {
  areWorkerCountsDirty,
  buildWorkerCountsBody,
  buildWorkerRows,
  invalidWorkerCountKeys,
  workerCountsFromEntry,
} from "./worker-counts";

/**
 * "Kayıt Gir" ekranının yerel form durumu (F-SD T2).
 *
 * KAPSAM SINIRI (üst kural, pending sızıntısı yok): burada YALNIZ backend'in
 * `SiteDiaryEntryCreate`/`SiteDiaryEntryUpdate`/`SiteDiaryLinesSave`
 * şemalarında karşılığı olan alanlar vardır. GK274-318'in fotoğraf kartı ve
 * GK321-348'in planlama bloğu ekranda BASILIR ama bu tipe GİRMEZ — dolayısıyla
 * kaydedilen gövdeye de giremezler.
 *
 * T3 EKLEMESİ — `workerCounts`: sağ paneldeki "Bugünkü İşçi Dağılımı"
 * (GK414-439) MOCKUP'TA GİRİLEBİLİR bir alandır ve backend `PATCH
 * /diary/{entry_id}` gövdesinde `worker_counts[]`i KABUL EDER
 * (`SiteDiaryEntryUpdate`, DEĞİŞTİRME semantiği) — bu yüzden sızıntı değil,
 * mockup'ın istediği gerçek alandır. Fotoğraf ve planlama alanları HÂLÂ
 * YOKTUR: onların backend karşılığı yok, gövdeye giremezler.
 */
export interface DiaryFormState {
  /** ISO `YYYY-MM-DD` (GK184). */
  entryDate: string;
  /** Bölüm seçimi; `""` = "Bölüm seçilmedi" (alan nullable, GK198). */
  sectionId: string;
  /** `""` = seçilmedi (alan nullable, GK188). */
  weather: Weather | "";
  /** Serbest metin; sayıya çevrilemezse gövdeye `null` gider (GK194). */
  temperatureC: string;
  /** GK271. */
  workDone: string;
  /** E7 143 — `chief_note`. */
  chiefNote: string;
  /** GK444-446 (E7 180-191). */
  safetyMeetingHeld: boolean;
  ppeChecked: boolean;
  hasIncident: boolean;
  /** GK447 (E7 195). */
  incidentNote: string;
  /** `boq_item_id` → "Bugün Yapılan" hücresinin HAM metni (GK228). */
  quantities: Record<string, string>;
  /** `workerCountKey(trade, source)` → işçi sayısı hücresinin HAM metni
   * (GK420/424/428/432). */
  workerCounts: Record<string, string>;
}

/** Boş form — yeni gün için (tarih varsayılanı ÇAĞIRANDAN gelir). */
export function emptyDiaryForm(entryDate: string): DiaryFormState {
  return {
    entryDate,
    sectionId: "",
    weather: "",
    temperatureC: "",
    workDone: "",
    chiefNote: "",
    safetyMeetingHeld: false,
    ppeChecked: false,
    hasIncident: false,
    incidentNote: "",
    quantities: {},
    workerCounts: {},
  };
}

/**
 * Sunucudaki kayıttan form durumu. Miktar hücreleri satırların KENDİ
 * değerinden doldurulur; `0` miktarlı satır BOŞ gösterilir (mockup'ta sıfır
 * yazan hücre yok, GK228-249) — kullanıcı "0" ile "girilmedi"yi ayırt
 * edemeyeceği için boş hücre daha dürüsttür.
 */
export function diaryFormFromEntry(entry: SiteDiaryEntryDetail): DiaryFormState {
  const quantities: Record<string, string> = {};
  for (const line of entry.lines) {
    if (line.boq_item_id === null) continue;
    quantities[line.boq_item_id] = Number(line.quantity) === 0 ? "" : line.quantity;
  }
  return {
    entryDate: entry.entry_date,
    sectionId: entry.section_id ?? "",
    weather: entry.weather ?? "",
    temperatureC: entry.temperature_c ?? "",
    workDone: entry.work_done ?? "",
    chiefNote: entry.chief_note ?? "",
    safetyMeetingHeld: entry.safety_meeting_held,
    ppeChecked: entry.ppe_checked,
    hasIncident: entry.has_incident,
    incidentNote: entry.incident_note ?? "",
    quantities,
    workerCounts: workerCountsFromEntry(entry.worker_counts),
  };
}

/** Boş/boşluk metni `null`a çevirir — backend nullable alanlarının sözleşmesi. */
function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Miktar hücresinin sayıya çevrimi. Türkçe klavyede ondalık ayracı virgüldür
 * (`2,4`) — nokta ile aynı sayıya çevrilir. Çevrilemeyen metin `null` döner;
 * çağıran bunu "bu satır gövdeye girmesin" diye kullanır, sessizce `0`
 * yazmaz (sessiz veri kaybı olurdu).
 */
export function parseDiaryQuantity(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Sıcaklık: sayıya çevrilemezse `null` (alan zaten opsiyonel). */
function parseTemperature(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `POST /sites/{site_id}/diary` gövdesi. Kayıt HER ZAMAN `draft` doğar ve
 * satır iskeleti BOQ'dan SUNUCUDA üretilir — bu yüzden gövdede `lines[]`,
 * `status` ya da `worker_counts` YOKTUR (openapi `SiteDiaryEntryCreate`).
 */
export function buildDiaryCreateBody(form: DiaryFormState): SiteDiaryEntryCreate {
  return {
    entry_date: form.entryDate,
    section_id: form.sectionId === "" ? null : form.sectionId,
    weather: form.weather === "" ? null : form.weather,
    temperature_c: parseTemperature(form.temperatureC),
    work_done: textOrNull(form.workDone),
    chief_note: textOrNull(form.chiefNote),
    safety_meeting_held: form.safetyMeetingHeld,
    ppe_checked: form.ppeChecked,
    has_incident: form.hasIncident,
    incident_note: textOrNull(form.incidentNote),
  };
}

/**
 * `PATCH /diary/{entry_id}` gövdesi — başlık alanları + işçi kırılımı (T3).
 *
 * `worker_counts` DEĞİŞTİRME semantiğindedir (openapi açıklaması): gövdeye
 * kaydın TÜM satırları (ön tanımlılar + kayıttan gelen fazlalıklar) girer,
 * sıfır olanlar SİLİNSİN diye dışarıda bırakılır. Hücrelerden biri geçersizse
 * alan HİÇ gönderilmez (`undefined`) — backend mevcut kırılımı korur, yanlış
 * bir sayı yazılmaz. Çağıran zaten `invalidWorkerCountKeys` ile önce durur.
 */
export function buildDiaryUpdateBody(
  form: DiaryFormState,
  entry: SiteDiaryEntryDetail,
): SiteDiaryEntryUpdate {
  const workerCounts =
    buildWorkerCountsBody(buildWorkerRows(entry.worker_counts), form.workerCounts) ?? undefined;
  return {
    worker_counts: workerCounts,
    entry_date: form.entryDate,
    section_id: form.sectionId === "" ? null : form.sectionId,
    weather: form.weather === "" ? null : form.weather,
    temperature_c: parseTemperature(form.temperatureC),
    work_done: textOrNull(form.workDone),
    chief_note: textOrNull(form.chiefNote),
    safety_meeting_held: form.safetyMeetingHeld,
    ppe_checked: form.ppeChecked,
    has_incident: form.hasIncident,
    incident_note: textOrNull(form.incidentNote),
  };
}

/**
 * `PUT /diary/{entry_id}/lines` gövdesi — DEĞİŞTİRME semantiği: gövdede
 * geçmeyen satır sıfırlanır. Bu yüzden kaydın TÜM satırları (miktarı `0`
 * olanlar dahil) gönderilir; kullanıcı bir hücreyi boşaltınca sıfırlanması
 * gereken satır sessizce eski değerinde kalmaz.
 *
 * `boq_item_id === null` olan satır (BOQ pozu silinmiş, öksüz satır)
 * GÖNDERİLEMEZ — şema `boq_item_id`i zorunlu tutar; bu satırlar atlanır.
 */
export function buildDiaryLinesBody(
  entry: SiteDiaryEntryDetail,
  form: DiaryFormState,
): SiteDiaryLinesSave {
  const lines = entry.lines
    .filter((line) => line.boq_item_id !== null)
    .map((line) => {
      const boqItemId = line.boq_item_id as string;
      const parsed = parseDiaryQuantity(form.quantities[boqItemId] ?? "");
      return { boq_item_id: boqItemId, quantity: parsed ?? Number(line.quantity) };
    });
  return { lines };
}

/** Geçersiz miktar girilmiş hücrelerin poz kimlikleri (görünür hata için). */
export function invalidQuantityIds(form: DiaryFormState): string[] {
  return Object.entries(form.quantities)
    .filter(([, value]) => parseDiaryQuantity(value) === null)
    .map(([id]) => id);
}

/** Geçersiz işçi sayısı girilmiş hücrelerin anahtarları (görünür hata için). */
export function invalidWorkerCountIds(form: DiaryFormState): string[] {
  return invalidWorkerCountKeys(form.workerCounts);
}

/**
 * Yerel form sunucudaki kayıttan ayrıştı mı? Türev sütunları (Kümülatif,
 * Hakediş ₺, tfoot) YANITTAN geldiği için, kaydedilmemiş değişiklik varken
 * ekran bunları "güncel" gibi göstermemeli — bu bayrak görünür uyarıyı açar.
 */
export function isDiaryFormDirty(entry: SiteDiaryEntryDetail, form: DiaryFormState): boolean {
  const saved = diaryFormFromEntry(entry);
  if (
    saved.entryDate !== form.entryDate ||
    saved.sectionId !== form.sectionId ||
    saved.weather !== form.weather ||
    saved.workDone !== form.workDone.trim() ||
    saved.chiefNote !== form.chiefNote.trim() ||
    saved.safetyMeetingHeld !== form.safetyMeetingHeld ||
    saved.ppeChecked !== form.ppeChecked ||
    saved.hasIncident !== form.hasIncident ||
    saved.incidentNote !== form.incidentNote.trim()
  ) {
    return true;
  }
  if (parseTemperature(saved.temperatureC) !== parseTemperature(form.temperatureC)) return true;
  if (areWorkerCountsDirty(entry.worker_counts, buildWorkerRows(entry.worker_counts), form.workerCounts)) {
    return true;
  }
  const ids = new Set([...Object.keys(saved.quantities), ...Object.keys(form.quantities)]);
  for (const id of ids) {
    if (parseDiaryQuantity(saved.quantities[id] ?? "") !== parseDiaryQuantity(form.quantities[id] ?? "")) {
      return true;
    }
  }
  return false;
}

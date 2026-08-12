import {
  COLUMN_PENDING_REASON,
  SOURCE_BADGE_VARIANT,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  WORKER_SOURCE_LABELS,
} from "@/components/personnel/personnel-list-labels";
import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * F-PT2 T3 · PD — `/personel/[id]` detay ekranının etiket/rozet/pending
 * gerekçe sabitleri. Yorumlardaki sayılar `Personel Detay.dc.html`in SATIR
 * numaralarıdır.
 *
 * Rozet/etiket haritaları T2'nin `personnel-list-labels.ts`ten AYNEN ithal
 * edilir — ikinci bir kaynak YOK (görev emri kuralı).
 */
export { SOURCE_BADGE_VARIANT, STATUS_BADGE_VARIANT, STATUS_LABEL, WORKER_SOURCE_LABELS };

export const PENDING_VALUE = "—";

/** 40-62 başlık kartındaki alanlardan sunucu sözleşmesinde karşılığı OLMAYANLAR. */
export const HEADER_FIELD_PENDING_REASON = COLUMN_PENDING_REASON;

/** 66-86 · "Puantaj Özeti" — kişi-bazlı puantaj özeti ucu YOK (spec K4). */
export const TIMESHEET_SUMMARY_PENDING_REASON =
  "Personel bazlı puantaj özeti ucu backend'de henüz yok — bu kart hiçbir ek sorgu atmaz.";

/** 88-113 · "İzin & Haklar" — İK dilimi. */
export const LEAVE_PENDING_REASON = "İzin ve hak takibi İnsan Kaynakları dilimiyle birlikte gelir.";

/** 115-128 · "Proje Geçmişi" — İK dilimi. */
export const PROJECT_HISTORY_PENDING_REASON =
  "Proje geçmişi takibi İnsan Kaynakları dilimiyle birlikte gelir.";

/** 130-141 · "Belgeler" — BC-2 form-slot bekliyor (personnel-form ile AYNI gerekçe). */
export const DOCUMENTS_PENDING_REASON = pendingModuleLabel("documents");

/** 23 · "Bordroyu Gör" — bordro/maaş ucu yok. */
export const PAYROLL_PENDING_REASON = "Bordro modülü henüz eklenmedi.";

/** 22 · "Düzenle" — GERÇEK, `/personel/[id]/duzenle`e gider. */
export const EDIT_HREF_SUFFIX = "/duzenle";

/** 70 · "Tümü →" — GERÇEK, genel puantaj ekranına gider (spec §1). */
export const TIMESHEET_ALL_HREF = "/puantaj";

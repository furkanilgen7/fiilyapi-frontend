import type { ReactNode } from "react";

/**
 * PLN-F3.6a · Rapor ekranlarının (Panel / GİR / QURR) ORTAK sözleşmesi
 * (F3-SOZLESME.md §2). Üç ekran (`PanelScreen`, `DailyReportScreen`,
 * `WeeklyQurrScreen`) BU tipleri paylaşır; sahibi B/C bu imzalara KODLAR.
 *
 * Kaynak deseni: `BudgetScreen` (Adam-Saat Bütçesi) — `siteId`/`siteName`/
 * `siteCompleted`/`links`/`picker` aynı rolü taşır, yalnız `links` burada
 * rapor gezinmesinin TEK kaynağıdır (üç rapor + Günlük Kayıt + Bütçe).
 */

/**
 * Rapor ekranları arası + Günlük Kayıt/Bütçe'ye giden bağlantılar. Üretici
 * `views/` sarmalayıcılarıdır (A); ekranlar (`WeeklyQurrScreen`,
 * `DailyReportScreen`, `PanelScreen`) bunu YALNIZ tüketir, kendi yol
 * kurmaz (URL-1 kuralı).
 */
export interface ReportLinks {
  /** Günlük Kayıt (F3.0 `?tarih=`); `day` verilmezse tarihsiz (bugün). */
  diary: (day?: string) => string;
  /** Adam-Saat Bütçesi. */
  budget: string;
  /** Günlük İlerleme Raporu (GİR); `date` verilmezse tarihsiz. */
  dailyReport: (date?: string) => string;
  /** Haftalık QURR; `week` verilmezse haftasız (backend bugünün haftası). */
  weeklyReport: (week?: number) => string;
  /** Planlama Paneli. */
  panel: string;
}

/**
 * Rapor ekranlarının ortak girdisi. Şantiye altı ikizde `siteId`/`siteName`
 * rotadan gelir (kanonik); kök ikizde `useEvSiteParam` çözer — ikisi de bu
 * tek arayüze düşer, ekran gövdesi kökte mi şantiye altında mı olduğunu
 * BİLMEZ (Bütçe/`GeneralManHourBudgetView` ↔ `BudgetScreen` ikizliğinin
 * BİREBİR aynısı).
 */
export interface ReportScreenProps {
  /** Kanonik UUID; şantiye henüz çözülmediyse "" (gövde iskelet/seçici basar). */
  siteId: string;
  /** Başlık bloğu için; bilinmiyorsa "". */
  siteName: string;
  /** Tamamlanmış şantiye → salt okunur (onay düğmesi YOK). */
  siteCompleted: boolean;
  links: ReportLinks;
  /** Kök ikizde sayfa BAŞLIĞINDAKİ şantiye seçici (S21); şantiye altı ikizde `undefined`. */
  picker?: ReactNode;
}

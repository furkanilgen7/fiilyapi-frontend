import { TimesheetSummaryStrip } from "@/components/timesheet/TimesheetSummaryStrip";
import { TimesheetTable } from "@/components/timesheet/TimesheetTable";
import type { TimesheetDerived } from "@/components/timesheet/derive";
import "@/components/timesheet/timesheet.css";

/**
 * F-BLMPUAN — Bölüm Detay › "İşçiler & Puantaj" sekmesinin GÖVDESİ.
 *
 * 🔴 MOCKUP BU SEKME İÇİN PANEL ÇİZMEZ: `Bölüm Detay.dc.html`de aktif sekme
 * D100 "İş Kalemleri"dir ve D107+ onun tablosudur; "İşçiler & Puantaj"
 * panelinin çizimi DOSYADA YOKTUR. Bu yüzden yeni bir tasarım İCAT EDİLMEZ —
 * ŞP (`Şantiye - Puantaj.dc.html`) mockup'ından türetilmiş `TimesheetTable`
 * (+ ŞP 116-120 özet şeridi) `variant="site"` ile YENİDEN KULLANILIR (K6/DRY).
 *
 * 🔴 SALT OKUNURDUR: `canWrite`/`onCommit` VERİLMEZ, "Kaydet"/"Excel"/ay
 * gezinmesi BASILMAZ. Gerekçe K2'nin kendisidir — `PUT .../timesheet` dönem +
 * şantiye kapsamında DEĞİŞTİRMEDİR; bölüm kapsamlı bir yüzeyden yazmak diğer
 * bölümlerin kayıtlarını silme riskini bu ekrana taşırdı. Yazma yolu tektir ve
 * kart başındaki "Puantaj →" bağlantısının götürdüğü şantiye ekranındadır.
 *
 * 🔴 YÜKLEME/HATA dalları AYRI basılır (emsal: aynı ekranın BOQ dalı). Matris
 * yüklenmemişken tabloyu basmak, kartoteksten gelen (K1) BOŞ HÜCRELİ satırları
 * gösterir ve kullanıcıya *"bu bölümde bu ay kimse çalışmadı"* YALANINI söyler.
 */
export interface SectionTimesheetPanelProps {
  /** ŞP 117 karşılığı — bölüm adı; yanında dönem (ay gezinmesi YOK). */
  sectionName: string;
  /** "Ağustos 2026" — `formatPeriod` çıktısı. */
  periodLabel: string;
  view: TimesheetDerived;
  isLoading: boolean;
  isError: boolean;
}

export function SectionTimesheetPanel({
  sectionName,
  periodLabel,
  view,
  isLoading,
  isError,
}: SectionTimesheetPanelProps) {
  if (isError) {
    return <p className="section-detail__message">Puantaj matrisi yüklenemedi</p>;
  }
  if (isLoading) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }

  return (
    <div className="section-timesheet" data-testid="section-timesheet">
      {/* ŞP 116-120 — başlık DÖNEMİ de taşır: bu ekranda ay gezinmesi yoktur
          (mockup çizmiyor), dolayısıyla hangi ay olduğu başka yerden okunamaz. */}
      <TimesheetSummaryStrip
        title={`${sectionName} · ${periodLabel}`}
        workerCount={view.workerCount}
        totalManDays={view.totalManDays}
        totalOvertimeHours={view.totalOvertimeHours}
      />
      {/* ŞP 115-253 — salt okunur (`canWrite`/`onCommit` YOK). */}
      <TimesheetTable
        variant="site"
        days={view.days}
        rows={view.rows}
        totalManDays={view.totalManDays}
        emptyMessage={`${periodLabel} döneminde bu bölümde puantaj kaydı ve aktif personel yok.`}
      />
    </div>
  );
}

"use client";

import Link from "next/link";

import { ACCOUNTING_PERMISSION_MODULE } from "@/components/accounting/accounting-labels";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Select } from "@/components/ui";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { pendingModuleLabel } from "@/lib/pending-modules";

import {
  INCOME_STATEMENT_EXPORT_REASON,
  INCOME_STATEMENT_PERIOD_REASON,
  INCOME_STATEMENT_REASON,
  PERFORMANCE_SUMMARY_REASON,
  PROJECT_FILTER_REASON,
  PROJECT_PROFITABILITY_REASON,
} from "./income-statement";
import {
  FINANCIAL_NAV_HEADING,
  FINANCIAL_SUB_NAV,
} from "./shell/financial-statements-nav-config";
import "./financial-statements.css";

/**
 * E11 · `/mali-tablolar` KÖK ekranı — mockup `Ekran 11 - Mali Tablo.dc.html`.
 * Yorumlardaki sayılar O dosyanın SATIR numaralarıdır.
 *
 * 🔴 KAPSAM BİLEREK DARALTILDI. E11 bir GELİR TABLOSU ekranıdır ve backend
 * ucu YOKTUR (ölçüm `income-statement.ts` başında). Kanon (F-TH): "rotası
 * olmayan mockup öğesi SİLİNMEZ, devre dışı basılır" — rota AÇILIR, içeriği
 * DEVRE DIŞI basılır. Üç veri yüzeyi (tablo E11:87-147, Performans Özeti
 * E11:151-167, Proje Bazlı Karlılık E11:169-189), `PDF İndir` (E11:71), dönem
 * gezgini (E11:76-81) ve proje süzgeci (E11:82) devre dışıdır.
 *
 * 🔴 Gerekçeler ÖĞENİN YANINA YAZILMAZ: hepsi `pending-modules` kaydından
 * TÜRER (F-PRJTAB kanonu). Uç açıldığında anahtar kalkar, metin kendiliğinden
 * kaybolur — sabitlenmiş bir not ise çalışan yüzeyle çelişmeye devam ederdi.
 *
 * 🔴 DRILL SIDEBAR YOK. E11:36-58 TAM kabuk menüsünü çizer (girintili alt öğe
 * yok); BL/NA:24-31 ise drill menüyü çizer. Bu yüzden rota grubunda BİLEREK
 * `layout.tsx` YOKTUR ve iki yaprak ekran sidebar'ı kendi içinde basar.
 *
 * 🔴 SAHTE DURUM BAĞLANMAZ: dönem gezgini hiçbir şeyi yeniden çekmez, bu
 * yüzden `useState` ile "çalışıyormuş gibi" davranmaz ve mockup'ın
 * `Ocak – Temmuz 2026` etiketini de BASMAZ (uydurma dönem = uydurma veri).
 */
export function FinancialStatementsHomeView() {
  const permission = useModulePermission(ACCOUNTING_PERMISSION_MODULE);

  if (!permission.canView) return <AccessDenied />;

  return (
    <div className="fs mali-tablolar-content">
      {/* E11:62 — üst etiket; BL:33'ün aksine BAĞLANTI DEĞİLDİR (burası kök). */}
      <p className="fs__eyebrow" data-testid="mt-eyebrow">
        {FINANCIAL_NAV_HEADING}
      </p>

      <div className="fs__head">
        {/* E11:64 */}
        <h1 className="fs__title">Mali Tablolar</h1>
        <div className="fs__actions">
          <SegmentedControl />
          {/* E11:71 — ucu YOK; silinmez, devre dışı + gerekçesi EKRANDA. */}
          <Button variant="secondary" disabled data-testid="mt-export-pdf">
            PDF İndir
          </Button>
        </div>
      </div>

      <p className="fs-notice" data-testid="mt-export-reason">
        “PDF İndir”: {pendingModuleLabel(INCOME_STATEMENT_EXPORT_REASON)}.
      </p>

      {/* E11:76-83 — dönem gezgini + proje süzgeci. İKİSİ DE İŞLEMEZ. */}
      <div className="fs-mt-filters">
        <div className="fs-mt-period" data-testid="mt-period">
          {/* E11:78/80 — `‹`/`›` (U+2039/U+203A) `fonts.css`in
              `u+2000-206f` alt kümesindedir; `PeriodPicker` emsalinde olduğu
              gibi HTML varlığı olarak yazılır. */}
          <button
            type="button"
            className="fs-mt-period__arrow"
            aria-label="Önceki dönem"
            data-testid="mt-period-prev"
            disabled
          >
            &lsaquo;
          </button>
          {/* 🔴 E11:79'un `Ocak – Temmuz 2026` metni BASILMAZ: bu ekranda dönem
              KARARI VEREN hiçbir veri yoktur ve bir dönem uydurmak, uydurma
              veri basmaktan farksızdır. Yuva yerinde durur, içi `—`dir. */}
          <span className="fs-mt-period__label" data-testid="mt-period-label">
            &mdash;
          </span>
          <button
            type="button"
            className="fs-mt-period__arrow"
            aria-label="Sonraki dönem"
            data-testid="mt-period-next"
            disabled
          >
            &rsaquo;
          </button>
        </div>

        {/* E11:82 — ham `<select>` YASAK, `ui` primitive'i kullanılır. Tek
            seçenek bırakılır: süzgecin ikinci seçeneği (`Güneşkent A-Blok`)
            uçta KARŞILIĞI OLMAYAN bir vaat olurdu. */}
        <Select
          size="row"
          disabled
          defaultValue="all"
          aria-label="Proje süzgeci"
          data-testid="mt-project-filter"
        >
          <option value="all">Tüm Projeler</option>
        </Select>
      </div>

      <p className="fs-notice" data-testid="mt-period-reason">
        “Dönem”: {pendingModuleLabel(INCOME_STATEMENT_PERIOD_REASON)}.
      </p>
      <p className="fs-notice" data-testid="mt-project-filter-reason">
        “Proje süzgeci”: {pendingModuleLabel(PROJECT_FILTER_REASON)}.
      </p>

      {/* E11:85 — iki sütunlu ızgara. */}
      <div className="fs-mt-grid" data-testid="mt-grid">
        {/* E11:87-147 — tablo kartı. Satırlar BASILMAZ: hepsi sunucudan
            gelecek para/oran değerleridir. */}
        <PendingCard
          testId="mt-income-statement"
          title="Gelir Tablosu"
          reasonKey={INCOME_STATEMENT_REASON}
        />

        {/* E11:150 — sağ sütun: iki özet kartı, 14px aralıkla. */}
        <div className="fs-mt-aside">
          {/* E11:151-167 */}
          <PendingCard
            testId="mt-performance"
            title="Performans Özeti"
            reasonKey={PERFORMANCE_SUMMARY_REASON}
          />
          {/* E11:169-189 */}
          <PendingCard
            testId="mt-profitability"
            title="Proje Bazlı Karlılık"
            reasonKey={PROJECT_PROFITABILITY_REASON}
          />
        </div>
      </div>

      {/* Görsel spec'in "yüklendi" iddiasının damgası (`bl-*`/`na-*` ailesi). */}
      <span hidden data-testid="mt-loaded" />
    </div>
  );
}

/**
 * E11:66-70 — segment denetimi. Sekmeler `FINANCIAL_SUB_NAV`ten TÜRER, elle
 * ikinci bir liste YAZILMAZ: drill sidebar'la aynı tek kaynak, aynı sıra.
 *
 * 🔴 `Gelir Tablosu` (E11:67) mockup'ta AKTİF segmenttir çünkü BULUNULAN
 * sayfa odur — bağlantı DEĞİLDİR. `aria-current="page"` de TAŞIMAZ: kabuk
 * sidebar'ının `Mali Tablolar` öğesi bu rotada zaten `aria-current="page"`
 * sürüyor ve ikincisi ekran okuyucuya "iki ayrı sayfadasınız" derdi.
 */
function SegmentedControl() {
  return (
    <div className="fs-mt-seg" data-testid="mt-segments">
      {FINANCIAL_SUB_NAV.map((item) =>
        item.kind === "link" ? (
          <Link
            key={item.label}
            href={item.href}
            className="fs-mt-seg__item"
            data-testid={`mt-seg-${item.href.split("/").pop()}`}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.label}
            className="fs-mt-seg__item fs-mt-seg__item--current"
            data-testid="mt-seg-current"
          >
            {item.label}
          </span>
        ),
      )}
    </div>
  );
}

interface PendingCardProps {
  readonly testId: string;
  readonly title: string;
  /** 🔴 Metin DEĞİL, ANAHTAR: gerekçe kayıttan TÜRER (F-PRJTAB kanonu). */
  readonly reasonKey: string;
}

/**
 * E11:87 · E11:151 · E11:169 — üç kartın ORTAK devre dışı kabuğu.
 *
 * `CashProjectionCard` emsali: `aria-disabled` KULLANILMAZ (`<section>`ın
 * örtük `region` rolü onu desteklemez) ve kartta tıklanabilir öğe yoktur —
 * "devre dışı"lığı taşıyan şey GÖRÜNÜR gerekçedir, `title`daki bir ipucu
 * değil.
 */
function PendingCard({ testId, title, reasonKey }: PendingCardProps) {
  return (
    <section className="fs-mt-card fs-mt-card--disabled" data-testid={testId}>
      <div className="fs-mt-card__head">
        <h2 className="fs-mt-card__title">{title}</h2>
        {/* E11:90 — alt satırda dönem yazar; dönem BİLİNMEDİĞİ için `—`. */}
        <p className="fs-mt-card__sub">&mdash;</p>
      </div>
      <p className="fs-notice" data-testid={`${testId}-reason`}>
        {pendingModuleLabel(reasonKey)}.
      </p>
    </section>
  );
}

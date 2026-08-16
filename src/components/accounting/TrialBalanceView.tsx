"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useTrialBalance } from "@/lib/api/hooks/useTrialBalance";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { pendingModuleLabel } from "@/lib/pending-modules";

import {
  ACCOUNTING_PERMISSION_MODULE,
  ACCOUNTING_REASONS,
  ACCOUNTING_URL,
  currentPeriod,
  type Period,
} from "./accounting-labels";
import { PeriodPicker } from "./PeriodPicker";
import { trialBalanceRangeLabel } from "./trial-balance";
import { TrialBalanceBanner } from "./TrialBalanceBanner";
import { TrialBalanceTable } from "./TrialBalanceTable";
import "./accounting.css";

/**
 * MZ · `/muhasebe/mizan` — mockup `Muhasebe - Mizan.dc.html`. Yorumlardaki
 * sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın üst barı (MZ:18-26) ve sol menüsü (MZ:28-37) BASILMAZ: üst bar
 * kabuk canon'udur, sol menü `MuhasebeSidebar` olarak grubun `layout.tsx`inde
 * yaşar.
 *
 * 🔴 EKRAN SALT-OKURDUR: burada hiçbir `POST/PATCH/PUT/DELETE` yoktur.
 * Dönem kapatma/açma uçları (`accounting-periods`) MU-2 ile canlıdadır ama
 * MZ hiçbir kapat/aç düğmesi ÇİZMEZ ⇒ bu dilimde ekrana BAĞLANMAZ (K5).
 *
 * 🔴 Süzgeç URL'de TAŞINMAZ (bileşen state'i) — bu yüzden `useSearchParams`
 * yoktur ve `Suspense` sarmalayıcısı GEREKMEZ (`muhasebe/page.tsx` kanonu).
 */
export function TrialBalanceView() {
  const permission = useModulePermission(ACCOUNTING_PERMISSION_MODULE);

  // 🔴 K4 · varsayılan dönem YEREL takvimden (`currentPeriod`); `toISOString()`
  // UTC'ye çevirir ve TR saatinde ayın ilk/son gününde dönemi kaydırırdı (TB5).
  const [period, setPeriod] = useState<Period>(() => currentPeriod(new Date()));

  const trialBalanceQuery = useTrialBalance(period.year, period.month);

  if (!permission.canView || isForbidden(trialBalanceQuery.error)) {
    return <AccessDenied />;
  }

  const data = trialBalanceQuery.data;
  const errorMessage = trialBalanceQuery.isError
    ? backendErrorMessage(trialBalanceQuery.error, "Mizan yüklenemedi.")
    : undefined;

  return (
    <div className="mu">
      {/* MZ:39 — kabuğun breadcrumb'ı yerine mockup'ın geri bağlantısı. */}
      <p className="mu__eyebrow">
        <Link href={ACCOUNTING_URL} className="mu__back" data-testid="mz-back">
          ← Muhasebe
        </Link>
      </p>

      <div className="mu__head">
        {/* MZ:41 */}
        <h1 className="mu__title">Mizan</h1>
        <div className="mu__actions">
          {/* 🔴 MZ:43-47 — gezgin BİRİKİMLİ ARALIĞI adlandırır (`Ocak–Temmuz
              2026`), tek ayı DEĞİL: uç `year`+`month` alır ama pencere
              "1 Ocak → seçilen ayın son günü"dür. Etiket bu yüzden AÇIKÇA
              geçilir. Ok düğmelerinde ÜST SINIR YOKTUR — mockup sınır
              çizmiyor, ileri gidilebilir ve veri boş gelir (K4). */}
          <PeriodPicker
            period={period}
            onChange={setPeriod}
            label={trialBalanceRangeLabel(period)}
          />
          {/* MZ:48-49 — iki dışa aktarma düğmesinin de UCU YOK; düğmeler
              SİLİNMEZ (F-TH kanonu), devre dışı + gerekçeleri EKRANDA
              (`title`da SAKLANMAZ). */}
          <Button variant="secondary" disabled data-testid="mz-export-excel">
            Excel
          </Button>
          <Button variant="secondary" disabled data-testid="mz-export-pdf">
            PDF
          </Button>
        </div>
      </div>

      <p className="mu-notice" data-testid="mz-export-reason">
        “Excel” / “PDF”: {pendingModuleLabel(ACCOUNTING_REASONS.trialBalanceExport)}.
      </p>

      {/* MZ:54-57 — kontrol banner'ı. Veri gelmeden BASILMAZ: `is_balanced`
          bilinmezken "dengede" demek de "dengesiz" demek de uydurma olurdu. */}
      {data !== undefined && (
        <TrialBalanceBanner isBalanced={data.is_balanced} totals={data.totals} />
      )}

      {/* MZ:59-173 — tablo kartı. */}
      <section className="mu-panel" aria-label="Mizan">
        <TrialBalanceTable
          rows={data?.rows}
          totals={data?.totals}
          isLoading={trialBalanceQuery.isLoading}
          errorMessage={errorMessage}
        />
      </section>

      {/* Görsel spec (T6) "yüklendi" iddiasını KAYNAĞA bağlar — damga "veri
          geldi" der, "ekrana bastı" DEMEZ (gerçek rakam ayrıca ölçülür). */}
      {data !== undefined && <span hidden data-testid="mz-loaded" />}
    </div>
  );
}

"use client";

import type { ReportScreenProps } from "../kit/report-screen";
import "./panel-screen.css";

/**
 * PLN-F3.6a · Planlama Paneli — YER TUTUCU (sonraki turda gövde gelecek,
 * bkz. `PLANLAMA-SPEC.md` §3.4, mockup `Planlama - Panel.dc.html`).
 *
 * Bu tur yalnız rota iskeletini kurar: başlık bloğu (firma · proje · şantiye)
 * + kök ikizde seçici (`picker`). Filtreler (`?tarih&aralik&disiplin&yuklenici`),
 * KPI kartları, S-eğrisi, histogram ve satır ağacı BU TURUN KAPSAMI DIŞINDA.
 */
export function PanelScreen({ siteName, companyName, projectName, picker }: ReportScreenProps) {
  const breadcrumb = [companyName, projectName, siteName].filter((part) => part !== "").join(" · ");
  return (
    <div className="ev-panel">
      <div className="ev-panel__head">
        <div>
          <h1 className="ev-panel__title">Planlama Paneli</h1>
          {breadcrumb !== "" && <p className="ev-panel__subtitle">{breadcrumb}</p>}
        </div>
        {picker}
      </div>
      <p className="ev-panel__pending">Panel gövdesi sonraki turda gelecek.</p>
    </div>
  );
}

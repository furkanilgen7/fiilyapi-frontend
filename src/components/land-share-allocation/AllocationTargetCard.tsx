import { Field, Select } from "@/components/ui";
import { WarningTriangleIcon, inlineSymbolProps } from "@/components/ui/icons";
import type { BlockResponse } from "@/lib/api/hooks/useProjectBlocks";
import type { LandShareCountBalance, LandShareContract } from "@/lib/api/hooks/useLandShare";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";

import {
  ALLOCATION_ALL_BLOCKS,
  ALLOCATION_BLOCK_FILTER_LABEL,
  ALLOCATION_CONTRACT_LABEL,
  ALLOCATION_CONTRACT_NO_EMPTY,
  ALLOCATION_CONTRACT_RATIO_TITLE,
  ALLOCATION_CONTRACTOR_LABEL,
  ALLOCATION_CURRENT_STATE_TITLE,
  ALLOCATION_LANDOWNER_LABEL,
  ALLOCATION_PLACEHOLDER,
  ALLOCATION_PROJECT_LABEL,
  ALLOCATION_TARGET_CARD_TITLE,
  allocationExpectedNote,
  allocationUnassignedNote,
  contractSideLabel,
} from "./constants";

interface AllocationTargetCardProps {
  projects: readonly ProjectListItem[];
  projectId: string;
  projectsDisabled: boolean;
  /** PG 62 — SÜZGEÇ: bu projedeki bloklar. */
  blocks: readonly BlockResponse[];
  blockId: string;
  blocksDisabled: boolean;
  /** Sözleşme gelmediyse (404 · yükleniyor · hata) `null`. */
  contract: LandShareContract | null;
  countBalance: LandShareCountBalance | null;
  /** Özetin GÖRÜNÜR gerekçesi (404 boş hâli dâhil); yoksa `null`. */
  notice: string | null;
  onChangeProject: (projectId: string) => void;
  onChangeBlock: (blockId: string) => void;
}

/** Yüzde genişliği; payda 0 iken şerit ÇİZİLMEZ (0/0 `NaN` üretirdi). */
function widthPct(part: number, total: number): string {
  return total > 0 ? `${(part / total) * 100}%` : "0%";
}

/**
 * "🤝 Sözleşme & Hedef" kartı (PG 57-83).
 *
 * ⚠️ ÜÇ KUTUNUN ÜÇÜ DE FARKLI ROL OYNAR — TU 61-63 ile aynı ayrım sınıfı:
 *   · Proje (60) → PATH parametresi (`{project_id}`), gövdeye GİRMEZ
 *   · Kat Karşılığı Sözleşmesi (61) → 🔴 SALT OKUNUR. Mockup burada `<select>`
 *     DEĞİL bir `<div>` çizer; kaynağı `LandShareContract.contract_no`dur ve
 *     kullanıcı onu bu ekrandan DEĞİŞTİREMEZ (sözleşme proje kartının işidir).
 *   · Blok Filtresi (62) → 🔴 SÜZGEÇ, gövde alanı değil:
 *     `GET land-share/units?block_id=` sorgusuna gider.
 *
 * ⚠️ 🤝 (U+1F91D) glif bekçisinin izin listesindedir (PG 58) — olduğu gibi
 * basılır, ikon ikamesi GEREKMEZ. PG 80'in `⚠`sı ise ÇIPLAKTIR (VS16 YOK) ve
 * yasak sınıftadır → `WarningTriangleIcon`.
 *
 * 🔴 İKİ KUTUCUĞUN SAYILARI DA SUNUCUDAN GELİR. Beklenen adetler
 * (`our_expected_count`/`owner_expected_count`) orada TEK yuvarlamadan türer
 * (*"owner = toplam − our"*); istemcide `Math.round(total * pct)` yazmak 42
 * üniteyi 23+20=43 yapan ikinci bir hesap doğururdu.
 */
export function AllocationTargetCard({
  projects,
  projectId,
  projectsDisabled,
  blocks,
  blockId,
  blocksDisabled,
  contract,
  countBalance,
  notice,
  onChangeProject,
  onChangeBlock,
}: AllocationTargetCardProps) {
  const contractNo = contract?.contract_no ?? null;
  const unassignedNote = countBalance === null ? null : allocationUnassignedNote(countBalance);

  return (
    <section className="pf-card" data-testid="paylasim-form-hedef-kart">
      <h2 className="pf-card__title">🤝 {ALLOCATION_TARGET_CARD_TITLE}</h2>

      {notice && (
        <p className="uf-notice" data-testid="paylasim-form-ozet-uyari">
          {notice}
        </p>
      )}

      <div className="pf-grid pf-grid--3">
        {/* 60 — PATH parametresi */}
        <Field label={ALLOCATION_PROJECT_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="paylasim-form-proje"
              disabled={projectsDisabled}
              value={projectId}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              <option value="">{ALLOCATION_PLACEHOLDER}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 61 — SALT OKUNUR: seçim değil, sunucudan gelen olgu */}
        <Field label={ALLOCATION_CONTRACT_LABEL}>
          {(control) => (
            // `<div>` etiketlenebilir bir form kontrolü DEĞİLDİR (`Field`in
            // ürettiği bağlama ona oturmaz); bu yüzden erişilebilir ad
            // `aria-label` ile AÇIKÇA verilir — yoksa ekran okuyucu adsız bir
            // metin bloğu okurdu. Bağlama yine `Field`in kendi işidir, bu
            // dosyada elle kurulmaz.
            <div
              {...control}
              aria-label={ALLOCATION_CONTRACT_LABEL}
              className={`pg-contract-box${contractNo === null ? " pg-contract-box--empty" : ""}`}
              data-testid="paylasim-form-sozlesme-no"
            >
              {contractNo ?? ALLOCATION_CONTRACT_NO_EMPTY}
            </div>
          )}
        </Field>

        {/* 62 — SÜZGEÇ; gövdeye GİRMEZ */}
        <Field label={ALLOCATION_BLOCK_FILTER_LABEL}>
          {(control) => (
            <Select
              {...control}
              data-testid="paylasim-form-blok-suzgec"
              disabled={blocksDisabled || projectId === ""}
              value={blockId}
              onChange={(event) => onChangeBlock(event.target.value)}
            >
              <option value="">{ALLOCATION_ALL_BLOCKS}</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {contract && countBalance && (
        <div className="pg-tiles">
          {/* 65-72 — sözleşme oranı */}
          <div className="pg-tile pg-tile--ratio" data-testid="paylasim-form-oran-kutusu">
            <div className="pg-tile__title">{ALLOCATION_CONTRACT_RATIO_TITLE}</div>
            <div className="pg-bar">
              <div
                className="pg-bar__seg pg-bar__seg--ours"
                style={{ width: `${contract.our_share_pct}%` }}
              >
                {contractSideLabel(ALLOCATION_CONTRACTOR_LABEL, contract.our_share_pct)}
              </div>
              <div
                className="pg-bar__seg pg-bar__seg--owner"
                style={{ width: `${contract.owner_share_pct}%` }}
              >
                {contractSideLabel(ALLOCATION_LANDOWNER_LABEL, contract.owner_share_pct)}
              </div>
            </div>
            <div className="pg-tile__note">{allocationExpectedNote(countBalance)}</div>
          </div>

          {/* 73-81 — mevcut atama durumu */}
          <div className="pg-tile pg-tile--state" data-testid="paylasim-form-durum-kutusu">
            <div className="pg-tile__title">{ALLOCATION_CURRENT_STATE_TITLE}</div>
            <div className="pg-bar">
              <div
                className="pg-bar__seg pg-bar__seg--ours"
                style={{
                  width: widthPct(countBalance.our_assigned_count, countBalance.total_unit_count),
                }}
              >
                {countBalance.our_assigned_count}
              </div>
              <div
                className="pg-bar__seg pg-bar__seg--owner"
                style={{
                  width: widthPct(countBalance.owner_assigned_count, countBalance.total_unit_count),
                }}
              >
                {countBalance.owner_assigned_count}
              </div>
              <div
                className="pg-bar__seg pg-bar__seg--unassigned"
                style={{
                  width: widthPct(countBalance.unassigned_count, countBalance.total_unit_count),
                }}
              >
                {countBalance.unassigned_count}
              </div>
            </div>
            {unassignedNote && (
              <div className="pg-tile__note" data-testid="paylasim-form-atanmayan-notu">
                {/* 80 — mockup'ın `⚠`sı ÇIPLAKTIR (VS16 yok) → yasak sınıf → ikon */}
                <WarningTriangleIcon {...inlineSymbolProps} />
                {unassignedNote}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

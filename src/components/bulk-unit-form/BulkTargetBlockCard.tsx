import { Field, Select } from "@/components/ui";
import type { BlockResponse } from "@/lib/api/hooks/useProjectBlocks";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

import {
  BULK_ALL_SITES,
  BULK_BLOCK_LABEL,
  BULK_PLACEHOLDER,
  BULK_PROJECT_LABEL,
  BULK_SITE_LABEL,
  BULK_TARGET_CARD_TITLE,
} from "./constants";
import type { BulkUnitFormValues } from "./form-state";

interface BulkTargetBlockCardProps {
  values: BulkUnitFormValues;
  projects: readonly ProjectListItem[];
  sites: readonly SiteListItem[];
  /** Şantiye süzgecinden GEÇMİŞ blok listesi. */
  blocks: readonly BlockResponse[];
  projectsDisabled: boolean;
  sitesDisabled: boolean;
  blocksDisabled: boolean;
  blocksNotice: string | null;
  onChangeProject: (projectId: string) => void;
  onChangeSite: (siteId: string) => void;
  onChangeBlock: (blockId: string) => void;
}

/**
 * "📍 Hedef Blok" kartı (TU 58-65, üç sütun).
 *
 * ⚠️ ÜÇ SEÇİCİNİN ÜÇÜ DE FARKLI ROL OYNAR ve bu ayrım gövdeye yansır — UE 60-68
 * ile AYNI ayrım, ama burada bir tuzak daha var:
 *   · Proje (61) → PATH parametresi (`{project_id}`), gövdeye GİRMEZ
 *   · Şantiye (62) → YALNIZ SÜZGEÇ; `UnitBulkCreate`te karşılığı YOKTUR,
 *     şantiye bloktan türer (`units/models.py`: *"tek otorite `blocks`"*)
 *   · Blok (63) → gövdede `block_id`
 *
 * 🔴 EI (Excel içe aktarma) ile KARIŞTIRILMAMALIDIR: ORADA `site_id` GERÇEK
 * bir gövde alanıdır (*"YALNIZ yeni blok acarken kullanilir"*), burada DEĞİL.
 * İki ekranı aynı sanmak sessiz bir hata sınıfıdır; `build-body.ts` bunu adlı
 * bir testle de yasaklar.
 *
 * ⚠️ Şantiye süzgeci İSTEMCİDEDİR: `GET /projects/{id}/blocks` `site_id`
 * sorgu parametresi ALMAZ ama `BlockResponse` her satırda `site_id` taşır —
 * ikinci bir istek AÇILMAZ (UE emsali).
 *
 * ⚠️ 📍 (U+1F4CD) glif bekçisinin izin listesindedir (TU 59) — olduğu gibi
 * basılır, ikon ikamesi GEREKMEZ.
 */
export function BulkTargetBlockCard({
  values,
  projects,
  sites,
  blocks,
  projectsDisabled,
  sitesDisabled,
  blocksDisabled,
  blocksNotice,
  onChangeProject,
  onChangeSite,
  onChangeBlock,
}: BulkTargetBlockCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📍 {BULK_TARGET_CARD_TITLE}</h2>

      {blocksNotice && (
        <p className="uf-notice" data-testid="toplu-form-blok-uyari">
          {blocksNotice}
        </p>
      )}

      <div className="pf-grid pf-grid--3">
        {/* 61 — PATH parametresi */}
        <Field label={BULK_PROJECT_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-proje"
              disabled={projectsDisabled}
              value={values.projectId}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              <option value="">{BULK_PLACEHOLDER}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 62 — YALNIZ süzgeç; gövdeye GİRMEZ */}
        <Field label={BULK_SITE_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-santiye"
              disabled={sitesDisabled || values.projectId === ""}
              value={values.siteId}
              onChange={(event) => onChangeSite(event.target.value)}
            >
              <option value="">{BULK_ALL_SITES}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 63 — gövdede `block_id` */}
        <Field label={BULK_BLOCK_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-blok"
              disabled={blocksDisabled || values.projectId === ""}
              value={values.blockId}
              onChange={(event) => onChangeBlock(event.target.value)}
            >
              <option value="">{BULK_PLACEHOLDER}</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}

import { Field, Select } from "@/components/ui";
import type { BlockResponse } from "@/lib/api/hooks/useProjectBlocks";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

import { UNIT_LOCATION_CARD_TITLE } from "./constants";
import { deriveFloorOptions } from "./floor-options";
import type { UnitFormValues } from "./form-state";

const PLACEHOLDER = "Seçiniz..."; // UE 65

interface UnitLocationCardProps {
  values: UnitFormValues;
  projects: readonly ProjectListItem[];
  sites: readonly SiteListItem[];
  /** Şantiye süzgecinden GEÇMİŞ blok listesi. */
  blocks: readonly BlockResponse[];
  /** UE 66'yı besleyen seçili blok; yoksa kat listesi boştur. */
  selectedBlock: BlockResponse | null;
  projectsDisabled: boolean;
  sitesDisabled: boolean;
  blocksDisabled: boolean;
  blocksNotice: string | null;
  onChangeProject: (projectId: string) => void;
  onChangeSite: (siteId: string) => void;
  onChangeField: <K extends keyof UnitFormValues>(field: K, value: UnitFormValues[K]) => void;
}

/**
 * "📍 Konum" kartı (UE 60-68, dört sütun).
 *
 * ⚠️ ÜÇ SEÇİCİNİN ÜÇÜ DE FARKLI ROL OYNAR ve bu ayrım gövdeye yansır:
 *   · Proje (63) → PATH parametresi, gövdeye GİRMEZ
 *   · Şantiye (64) → YALNIZ SÜZGEÇ; `UnitCreate`te karşılığı YOKTUR, şantiye
 *     blok üzerinden türetilir (`units/models.py`: tek otorite `blocks`)
 *   · Blok (65) → gövdede `block_id`
 *
 * ⚠️ Kat (66) mockup'ta `<select>`tir ama `floor` sunucuda SERBEST METİNDİR
 * (KARAR 4). Seçenekler mockup'tan kopyalanmaz, SEÇİLİ BLOKTAN türetilir
 * (`floor-options.ts`) — yoksa 12 katlı blokta 2. kat seçilemezdi.
 */
export function UnitLocationCard({
  values,
  projects,
  sites,
  blocks,
  selectedBlock,
  projectsDisabled,
  sitesDisabled,
  blocksDisabled,
  blocksNotice,
  onChangeProject,
  onChangeSite,
  onChangeField,
}: UnitLocationCardProps) {
  const floors = deriveFloorOptions(selectedBlock);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📍 {UNIT_LOCATION_CARD_TITLE}</h2>

      {blocksNotice && (
        <p className="uf-notice" data-testid="unite-form-blok-uyari">
          {blocksNotice}
        </p>
      )}

      <div className="pf-grid pf-grid--4">
        {/* 63 — PATH parametresi */}
        <Field label="Proje" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-proje"
              disabled={projectsDisabled}
              value={values.projectId}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              <option value="">{PLACEHOLDER}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 64 — YALNIZ süzgeç; gövdeye GİRMEZ */}
        <Field label="Şantiye" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-santiye"
              disabled={sitesDisabled || values.projectId === ""}
              value={values.siteId}
              onChange={(event) => onChangeSite(event.target.value)}
            >
              <option value="">Tüm şantiyeler</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 65 — gövdede `block_id` */}
        <Field label="Blok" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-blok"
              disabled={blocksDisabled || values.projectId === ""}
              value={values.blockId}
              onChange={(event) => onChangeField("blockId", event.target.value)}
            >
              <option value="">{PLACEHOLDER}</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 66 — METİN; seçenekler seçili bloktan TÜRER, gerekçe GÖRÜNÜR basılır */}
        <Field label="Kat" required hint={floors.hint}>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-kat"
              disabled={selectedBlock === null}
              value={values.floor}
              onChange={(event) => onChangeField("floor", event.target.value)}
            >
              <option value="">{PLACEHOLDER}</option>
              {floors.options.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}

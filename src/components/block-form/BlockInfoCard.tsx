import { Field, Input, Select } from "@/components/ui";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

import {
  blockSiteHint,
  BLOCK_CODE_HINT,
  BLOCK_CODE_MAX_LENGTH,
  BLOCK_INFO_CARD_TITLE,
  BLOCK_NAME_MAX_LENGTH,
} from "./constants";
import type { BlockFormValues } from "./form-state";

const PLACEHOLDER = "Seçiniz..."; // BE 63 / 67

interface BlockInfoCardProps {
  values: BlockFormValues;
  projects: readonly ProjectListItem[];
  sites: readonly SiteListItem[];
  projectsDisabled: boolean;
  sitesDisabled: boolean;
  /** Alan dışı uyarı (yetki/yükleme hatası ya da "önce proje seçin"). */
  sitesNotice: string | null;
  onChangeProject: (projectId: string) => void;
  onChangeField: <K extends keyof BlockFormValues>(field: K, value: BlockFormValues[K]) => void;
}

/**
 * "🏢 Blok Bilgileri" kartı (BE 58-73, iki sütun).
 *
 * ⚠️ Proje seçici ONAYLI TÜRETİMdir (SY/DS ile aynı gerekçe): uçların hepsi
 * proje kapsamlıdır (`POST /projects/{id}/blocks`), seçim olmadan ne şantiye
 * listesi çekilebilir ne de kayıt yazılabilir. Mockup tek proje bağlamında
 * çizilidir (BE 63 `selected`), seçici köprü ŞARTTIR.
 *
 * ⚠️ BE 68 ipucundaki sayı ÇALIŞMA ZAMANINDAN gelir; mockup'ın "2"si o projenin
 * o günkü şantiye sayısıdır, biçim kararı değildir.
 */
export function BlockInfoCard({
  values,
  projects,
  sites,
  projectsDisabled,
  sitesDisabled,
  sitesNotice,
  onChangeProject,
  onChangeField,
}: BlockInfoCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">🏢 {BLOCK_INFO_CARD_TITLE}</h2>

      {sitesNotice && (
        <p className="uf-notice" data-testid="blok-form-santiye-uyari">
          {sitesNotice}
        </p>
      )}

      <div className="pf-grid pf-grid--2">
        {/* 62 — PATH parametresi; gövdeye GİRMEZ, şantiye listesini sürer. */}
        <Field label="Proje" required>
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-proje"
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

        {/* 66-68 — gövdede `site_id`; ipucundaki sayı listeden gelir. */}
        <Field label="Şantiye" required hint={blockSiteHint(sites.length)}>
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-santiye"
              disabled={sitesDisabled || values.projectId === ""}
              value={values.siteId}
              onChange={(event) => onChangeField("siteId", event.target.value)}
            >
              <option value="">{PLACEHOLDER}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 70 */}
        <Field label="Blok Adı" required>
          {(control) => (
            <Input
              {...control}
              data-testid="blok-form-ad"
              maxLength={BLOCK_NAME_MAX_LENGTH}
              placeholder="C Blok"
              value={values.name}
              onChange={(event) => onChangeField("name", event.target.value)}
            />
          )}
        </Field>

        {/* 71 — mono, SOLA yaslı; boş bırakılırsa sunucu üretir. */}
        <Field label="Blok Kodu" hint={BLOCK_CODE_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-mono"
              data-testid="blok-form-kod"
              maxLength={BLOCK_CODE_MAX_LENGTH}
              placeholder="YV-C"
              value={values.code}
              onChange={(event) => onChangeField("code", event.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

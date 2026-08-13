import { Field, Input, Select, Textarea } from "@/components/ui";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import type { SectionListItem } from "@/lib/api/hooks/useSiteSections";
import type { SiteListItem } from "@/lib/api/hooks/useSites";
import type { PurchasePriority } from "@/lib/api/hooks/usePurchaseRequests";

import {
  JUSTIFICATION_PLACEHOLDER,
  MAX_LENGTH,
  NEEDED_BY_HINT,
  PURCHASE_PRIORITY_OPTIONS,
  PURCHASE_REQUEST_NO_HINT,
  PURCHASE_REQUEST_NO_PLACEHOLDER,
  SECTION_LIST_EMPTY,
  SECTION_NEEDS_SITE,
  SECTIONS_LOAD_ERROR,
  SELECT_PLACEHOLDER,
  SITE_LIST_EMPTY,
  SITE_NEEDS_PROJECT,
  SITES_LOAD_ERROR,
  PROJECTS_LOAD_ERROR,
} from "./purchase-request-form-constants";
import type { PurchaseRequestFormValues } from "./purchase-request-form-state";
import type { PurchaseRequestFormErrors } from "./purchase-request-validate";

/** Bir açılır listenin yüklenme durumu — sessiz boş liste YASAK. */
export interface OptionListStatus {
  isLoading: boolean;
  isError: boolean;
}

interface PurchaseRequestFormInfoCardProps {
  values: PurchaseRequestFormValues;
  errors: PurchaseRequestFormErrors;
  /** Sunucunun ürettiği talep numarası — kayıttan ÖNCE `null`. */
  requestNo: string | null;
  projects: readonly ProjectListItem[];
  projectsStatus: OptionListStatus;
  sites: readonly SiteListItem[];
  sitesStatus: OptionListStatus;
  sections: readonly SectionListItem[];
  sectionsStatus: OptionListStatus;
  onChangeProject: (projectId: string) => void;
  onChangeSite: (siteId: string) => void;
  onChange: <K extends keyof PurchaseRequestFormValues>(
    field: K,
    value: PurchaseRequestFormValues[K],
  ) => void;
}

/** Listenin durumunu tek cümleye indirger (`null` ⇒ söylenecek bir şey yok). */
function listNote(
  status: OptionListStatus,
  options: { error: string; empty: string; blocked?: string; isBlocked?: boolean; count: number },
): string | null {
  if (options.isBlocked) return options.blocked ?? null;
  if (status.isError) return options.error;
  if (status.isLoading) return "Yükleniyor…";
  return options.count === 0 ? options.empty : null;
}

/**
 * "📋 Talep Bilgileri" kartı (FST 50-64).
 *
 * ⚠️ **Talep No (53) SALT-OKUNURDUR** ve kayıttan önce DEĞERİ YOKTUR: numarayı
 * sunucu üretir (`PurchaseRequestCreate` açıklaması). Mockup'ın
 * "SAT-2026-0058"i örnek veridir — uydurma numara BASILMAZ, yerine "kaydedince
 * atanır" yer tutucusu durur.
 *
 * ⚠️ **"Şantiye / Bölüm" (57) mockup'ta TEK select'tir** ama şemada İKİ ayrı
 * alan vardır (`site_id` + `section_id`) ve bölüm listesi ŞANTİYEYE bağlıdır
 * (`GET /sites/{id}/sections`). Tek kutuya sığdırmak, seçilen değerin hangi
 * alana yazılacağını BELİRSİZ bırakırdı. Mockup'ın hücresi ve etiketi AYNEN
 * korunur; içine iki kademeli seçici konur (onaylı sapma — raporlandı).
 */
export function PurchaseRequestFormInfoCard({
  values,
  errors,
  requestNo,
  projects,
  projectsStatus,
  sites,
  sitesStatus,
  sections,
  sectionsStatus,
  onChangeProject,
  onChangeSite,
  onChange,
}: PurchaseRequestFormInfoCardProps) {
  const projectNote = listNote(projectsStatus, {
    error: PROJECTS_LOAD_ERROR,
    empty: "Görebildiğiniz bir proje yok.",
    count: projects.length,
  });
  const siteNote = listNote(sitesStatus, {
    error: SITES_LOAD_ERROR,
    empty: SITE_LIST_EMPTY,
    blocked: SITE_NEEDS_PROJECT,
    isBlocked: values.projectId.length === 0,
    count: sites.length,
  });
  const sectionNote = listNote(sectionsStatus, {
    error: SECTIONS_LOAD_ERROR,
    empty: SECTION_LIST_EMPTY,
    blocked: SECTION_NEEDS_SITE,
    isBlocked: values.siteId.length === 0,
    count: sections.length,
  });

  return (
    <section className="pf-card">
      {/* 51 */}
      <h2 className="pf-card__title">📋 Talep Bilgileri</h2>
      <div className="pf-grid pf-grid--3">
        {/* 53 — SUNUCU üretir, salt-okunur */}
        <Field label="Talep No" hint={PURCHASE_REQUEST_NO_HINT}>
          {(control) => (
            <Input
              {...control}
              readOnly
              className="saf-mono"
              data-testid="talep-no"
              value={requestNo ?? ""}
              placeholder={PURCHASE_REQUEST_NO_PLACEHOLDER}
            />
          )}
        </Field>

        {/* 54 */}
        <Field label="Talep Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="talep-tarihi"
              value={values.requestDate}
              onChange={(event) => onChange("requestDate", event.target.value)}
            />
          )}
        </Field>

        {/* 55 — yıldız "Onaya Gönder" içindir; şema varsayılanı `normal` */}
        <Field label="Öncelik" required>
          {(control) => (
            <Select
              {...control}
              data-testid="talep-oncelik"
              value={values.priority}
              onChange={(event) =>
                onChange("priority", event.target.value as PurchasePriority)
              }
            >
              {PURCHASE_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 56 — TASLAKTA BİLE zorunlu tek alan */}
        <Field label="Proje" required hint={projectNote ?? undefined} error={errors.projectId}>
          {(control) => (
            <Select
              {...control}
              data-testid="talep-proje"
              disabled={projectsStatus.isLoading || projectsStatus.isError}
              value={values.projectId}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              <option value="">{SELECT_PLACEHOLDER}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 57 — mockup'ın TEK hücresi, şemanın İKİ alanı */}
        <Field label="Şantiye / Bölüm" hint={siteNote ?? sectionNote ?? undefined}>
          {(control) => (
            <span className="saf-pair">
              <Select
                {...control}
                aria-label="Şantiye"
                data-testid="talep-santiye"
                disabled={
                  values.projectId.length === 0 || sitesStatus.isLoading || sitesStatus.isError
                }
                value={values.siteId}
                onChange={(event) => onChangeSite(event.target.value)}
              >
                <option value="">{SELECT_PLACEHOLDER}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Bölüm"
                data-testid="talep-bolum"
                disabled={
                  values.siteId.length === 0 ||
                  sectionsStatus.isLoading ||
                  sectionsStatus.isError
                }
                value={values.sectionId}
                onChange={(event) => onChange("sectionId", event.target.value)}
              >
                <option value="">{SELECT_PLACEHOLDER}</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
            </span>
          )}
        </Field>

        {/* 58 */}
        <Field label="İhtiyaç Tarihi" required hint={NEEDED_BY_HINT} error={errors.neededBy}>
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="talep-ihtiyac-tarihi"
              value={values.neededBy}
              onChange={(event) => onChange("neededBy", event.target.value)}
            />
          )}
        </Field>
      </div>

      {/* 60-63 */}
      <div className="saf-justification">
        <Field label="Talep Gerekçesi" error={errors.justification}>
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              data-testid="talep-gerekce"
              maxLength={MAX_LENGTH.justification}
              placeholder={JUSTIFICATION_PLACEHOLDER}
              value={values.justification}
              onChange={(event) => onChange("justification", event.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

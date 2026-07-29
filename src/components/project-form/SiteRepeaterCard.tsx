import { Field, Input, Select } from "@/components/ui";

export interface SiteRow {
  name: string;
  /** Seçilen kullanıcının tam adı — metin, FK değil (§7.9). */
  siteManagerName: string;
  constructionAreaM2: string;
}

/** Gönderime hazır satır içi şantiye (backend `ProjectSiteInput` ile eşleşir). */
export interface SiteInputDraft {
  name: string;
  site_manager_name: string | null;
  construction_area_m2: number | null;
}

export function emptySiteRow(): SiteRow {
  return { name: "", siteManagerName: "", constructionAreaM2: "" };
}

export function isSiteRowEmpty(row: SiteRow): boolean {
  return (
    !row.name.trim() &&
    !row.siteManagerName.trim() &&
    !row.constructionAreaM2.trim()
  );
}

/** Adı boş ama diğer alanları dolu satır hatadır (§4.7). */
export function siteRowError(row: SiteRow): string | null {
  if (!isSiteRowEmpty(row) && !row.name.trim()) {
    return "Şantiye adı zorunludur.";
  }
  return null;
}

/** Tümü boş satırlar atılır; şef adı metne, alan sayıya dönüşür. */
export function collectSiteInputs(rows: readonly SiteRow[]): SiteInputDraft[] {
  return rows
    .filter((row) => !isSiteRowEmpty(row))
    .map((row) => ({
      name: row.name.trim(),
      site_manager_name: row.siteManagerName.trim() || null,
      construction_area_m2: row.constructionAreaM2.trim()
        ? Number(row.constructionAreaM2)
        : null,
    }));
}

interface SiteRepeaterCardProps {
  rows: SiteRow[];
  onChange: (rows: SiteRow[]) => void;
  /** Aktif kullanıcı tam adları (GET /users). */
  managerNames: string[];
  /** Satır index'ine hizalı hata mesajları (F12 doldurur). */
  errors?: (string | null)[];
}

/** Şantiyeler tekrarlayıcısı (mockup satır 133–145, spec §4.7). */
export function SiteRepeaterCard({
  rows,
  onChange,
  managerNames,
  errors,
}: SiteRepeaterCardProps) {
  function updateRow(index: number, patch: Partial<SiteRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...rows, emptySiteRow()]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">
        <span>📍 Şantiyeler</span>
        <span className="pf-card__note">
          Proje birden fazla şantiyeye bölünebilir
        </span>
      </h2>

      <div className="pf-sites">
        {rows.map((row, index) => (
          <div className="pf-site-row" key={index}>
            <Field label="Şantiye Adı" error={errors?.[index] ?? undefined}>
              {(control) => (
                <Input
                  {...control}
                  value={row.name}
                  placeholder="A-Blok Şantiyesi"
                  status={errors?.[index] ? "error" : "default"}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                />
              )}
            </Field>
            <Field label="Şantiye Şefi">
              {(control) => (
                <Select
                  {...control}
                  value={row.siteManagerName}
                  onChange={(e) =>
                    updateRow(index, { siteManagerName: e.target.value })
                  }
                >
                  <option value="">Seçiniz…</option>
                  {managerNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="İnşaat Alanı (m²)">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={row.constructionAreaM2}
                  placeholder="6420"
                  onChange={(e) =>
                    updateRow(index, { constructionAreaM2: e.target.value })
                  }
                />
              )}
            </Field>
            <button
              type="button"
              className="pf-site-row__del"
              aria-label="Şantiye satırını sil"
              onClick={() => removeRow(index)}
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" className="pf-site-add" onClick={addRow}>
          + Şantiye Ekle
        </button>
      </div>
    </section>
  );
}

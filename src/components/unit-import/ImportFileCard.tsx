import { useRef } from "react";

import { Badge, Button, Field, FileInput, Select } from "@/components/ui";
import { CheckIcon, UploadIcon, XIcon, inlineSymbolProps } from "@/components/ui/icons";
import { formatDocumentSize } from "@/components/documents/document-format";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

import {
  IMPORT_ACCEPT,
  IMPORT_DROPZONE_LABEL,
  IMPORT_EXPECTED_COLUMNS,
  IMPORT_EXPECTED_COLUMNS_LABEL,
  IMPORT_FILE_CARD_TITLE,
  IMPORT_FILE_HINT,
  IMPORT_FILE_READY_LABEL,
  IMPORT_FILE_REMOVE_LABEL,
  IMPORT_FILE_REPLACE_LABEL,
  IMPORT_NO_FILE_NOTICE,
  IMPORT_PLACEHOLDER,
  IMPORT_PROJECT_LABEL,
  IMPORT_ROWS_READ_SUFFIX,
  IMPORT_SITE_HINT,
  IMPORT_SITE_LABEL,
  IMPORT_TEMPLATE_LABEL,
} from "./constants";
import type { UnitImportFormValues } from "./build-request";

interface ImportFileCardProps {
  values: UnitImportFormValues;
  projects: readonly ProjectListItem[];
  sites: readonly SiteListItem[];
  projectsDisabled: boolean;
  sitesDisabled: boolean;
  /** Seçili dosya; henüz seçilmediyse `null`. */
  file: File | null;
  /** İSTEMCİ ön kontrolünün ya da sunucunun dosya düzeyi hatası. */
  fileError: string | null;
  /** Doğrulama yapıldıysa okunan satır sayısı (EI 69); yoksa `null`. */
  rowsRead: number | null;
  templateBusy: boolean;
  templateError: string | null;
  onChangeProject: (projectId: string) => void;
  onChangeSite: (siteId: string) => void;
  onSelectFile: (file: File | null) => void;
  onRemoveFile: () => void;
  onDownloadTemplate: () => void;
}

/**
 * "Dosya Seçimi" kartı (EI 57-89).
 *
 * 🔴 ÜÇ SEÇİMİN ÜÇÜ DE FARKLI ROL OYNAR:
 *   · Hedef Proje (60) → **PATH** parametresi (`{project_id}`), gövdeye GİRMEZ
 *   · Hedef Şantiye (61) → **GERÇEK GÖVDE ALANI** (`site_id`)
 *   · Dosya (76) → `file` alanı
 *
 * 🔴 TU İLE KARIŞTIRILMAMALIDIR: toplu üretimde (TU 62) şantiye YALNIZ blok
 * listesini daraltan bir süzgeçtir ve gövdeye girmez; BURADA gövdeye girer,
 * çünkü içe aktarma dosyada geçen ama projede olmayan blokları AÇAR ve yeni
 * bloğun şantiyesi bu alandan gelir (`router.py`: *"YALNIZ yeni blok acarken
 * kullanilir"*). İki ekranı aynı sanmak sessiz bir hata sınıfıdır.
 *
 * 🔴 ONAYLI SAPMA — MOCKUP METNİ SUNUCUYLA ÇELİŞİYOR (bu dilimin TEK sapması):
 * EI 76 `accept=".xlsx,.xls,.csv"` ve EI 79 "XLSX, XLS veya CSV · Maks 10 MB"
 * yazar; sunucu ise YALNIZ `.xlsx` kabul eder (`ensure_xlsx`: *"`openpyxl`
 * yalniz `.xlsx` okur"*, spec §7.8) ve sınır **2 MB**tır (`MAX_IMPORT_BYTES`),
 * ayrıca en fazla **1000 satır**. Mockup birebir basılsaydı kullanıcı `.csv`
 * seçer, 8 MB'lık dosyayı yükler ve reddedilirdi — sessiz tuzak. Ekran
 * GERÇEĞİ yazar; metinler `constants.ts`ten, yani sunucudan kopyadır.
 *
 * ⚠️ `📊` (EI 66) ve `📋` (EI 83) glif bekçisinin İZİN LİSTESİNDEDİR ve olduğu
 * gibi basılır. EI 69'un `✓`sı ise YASAKTIR → `CheckIcon`. EI 58'in keycap
 * `1️⃣`i de izinli değildir (U+20E3 birleştiricisi) → adım numarası `Badge`
 * olarak basılır; başka bir emoji ile İKAME ETMEK yasaktır.
 *
 * ⚠️ Ham `<input type="file">` YAZILMAZ (form kontrolleri primitive kuralı):
 * `FileInput` kullanılır. Mockup girdiyi tamamen gizleyip etiketi tıklatır;
 * burada kontrol GÖRÜNÜR kalır — klavye kullanıcısı için tek erişilebilir yol
 * odur ve `FileInput` beş ekranda zaten böyle basılıyor.
 */
export function ImportFileCard({
  values,
  projects,
  sites,
  projectsDisabled,
  sitesDisabled,
  file,
  fileError,
  rowsRead,
  templateBusy,
  templateError,
  onChangeProject,
  onChangeSite,
  onSelectFile,
  onRemoveFile,
  onDownloadTemplate,
}: ImportFileCardProps) {
  // EI 71 "Değiştir" mockup'ta ayrı bir düğmedir ama işi dosya seçicisini
  // açmaktır; ikinci bir gizli girdi açmak yerine görünen kontrole devredilir.
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="pf-card" data-testid="excel-form-dosya-kart">
      {/* 58 */}
      <h2 className="pf-card__title">
        <Badge variant="primary" shape="count" className="ei-step">
          1
        </Badge>
        {IMPORT_FILE_CARD_TITLE}
      </h2>

      <div className="pf-grid pf-grid--2">
        {/* 60 — PATH parametresi */}
        <Field label={IMPORT_PROJECT_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="excel-form-proje"
              disabled={projectsDisabled}
              value={values.projectId}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              <option value="">{IMPORT_PLACEHOLDER}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 61 — GERÇEK gövde alanı (`site_id`) */}
        <Field label={IMPORT_SITE_LABEL} hint={IMPORT_SITE_HINT}>
          {(control) => (
            <Select
              {...control}
              data-testid="excel-form-santiye"
              disabled={sitesDisabled || values.projectId === ""}
              value={values.siteId}
              onChange={(event) => onChangeSite(event.target.value)}
            >
              <option value="">{IMPORT_PLACEHOLDER}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* 65-73 — yüklenmiş dosya özeti. Dosya yokken kutu ÇİZİLMEZ; boş bir
          yeşil kutu "yüklendi" derdi. */}
      {file === null ? (
        <p className="ei-file-empty" data-testid="excel-form-dosya-bos">
          {IMPORT_NO_FILE_NOTICE}
        </p>
      ) : (
        <div className="ei-file" data-testid="excel-form-dosya-ozet">
          {/* 66 — izin listesindeki emoji, olduğu gibi */}
          <span className="ei-file__icon" aria-hidden="true">
            📊
          </span>
          <div className="ei-file__text">
            <span className="ei-file__name">{file.name}</span>
            <span className="ei-file__meta">
              {formatDocumentSize(file.size)}
              {rowsRead !== null && ` · ${rowsRead} ${IMPORT_ROWS_READ_SUFFIX}`}
              {" · "}
              <CheckIcon {...inlineSymbolProps} />
              {` ${IMPORT_FILE_READY_LABEL}`}
            </span>
          </div>
          {/* 71 */}
          <Button
            variant="secondary"
            size="sm"
            data-testid="excel-form-dosya-degistir"
            onClick={() => fileInputRef.current?.click()}
          >
            {IMPORT_FILE_REPLACE_LABEL}
          </Button>
          {/* 72 — mockup'ta `×`; ikon + erişilebilir ad */}
          <Button
            variant="ghost"
            size="sm"
            className="ei-file__remove"
            aria-label={IMPORT_FILE_REMOVE_LABEL}
            data-testid="excel-form-dosya-kaldir"
            onClick={onRemoveFile}
          >
            <XIcon {...inlineSymbolProps} />
          </Button>
        </div>
      )}

      {/* 75-80 — bırakma alanı */}
      <div className="ei-drop">
        <UploadIcon className="ei-drop__icon" aria-hidden="true" />
        <Field
          label={IMPORT_DROPZONE_LABEL}
          hint={IMPORT_FILE_HINT}
          error={fileError ?? undefined}
          className="ei-drop__field"
        >
          {(control) => (
            <FileInput
              {...control}
              ref={fileInputRef}
              // 🔴 YALNIZ `.xlsx` — EI 76'nın `.xls,.csv`si sunucuda REDDEDİLİR.
              accept={IMPORT_ACCEPT}
              status={fileError ? "error" : "default"}
              data-testid="excel-form-dosya"
              onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
            />
          )}
        </Field>
      </div>

      {/* 82-88 — beklenen kolonlar + şablon indirme */}
      <div className="ei-columns" data-testid="excel-form-kolonlar">
        <span className="ei-columns__icon" aria-hidden="true">
          📋
        </span>
        <p className="ei-columns__text">
          <strong>{IMPORT_EXPECTED_COLUMNS_LABEL}</strong> {IMPORT_EXPECTED_COLUMNS.join(", ")}
        </p>
        {/* 87 — mockup'ta ikinci "Şablon İndir" (37 üst barda) */}
        <Button
          variant="primary"
          size="sm"
          className="ei-columns__button"
          data-testid="excel-form-sablon"
          disabled={templateBusy || values.projectId === ""}
          onClick={onDownloadTemplate}
        >
          {templateBusy ? "İndiriliyor…" : IMPORT_TEMPLATE_LABEL}
        </Button>
      </div>

      {templateError && (
        <p className="ei-inline-error" data-testid="excel-form-sablon-hata">
          {templateError}
        </p>
      )}
    </section>
  );
}

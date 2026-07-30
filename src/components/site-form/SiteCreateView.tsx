"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { useProject, type ProjectDetail } from "@/lib/api/hooks/useProjects";
import { BackendError, isForbidden } from "@/lib/api/unwrap";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { PROJECT_TABS } from "@/components/projects/tabs";
import { SiteDocumentsCard } from "./SiteDocumentsCard";
import { SiteFormActions } from "./SiteFormActions";
// Sıra önemli: önce paylaşılan kabuk, sonra forma özgü bloklar (özgü kazansın).
import "@/styles/form-shell.css";
import "./site-form.css";

/**
 * Proje tipi etiketi — P1.1a/P1'in MEVCUT eşlemesinden okunur (yeni sözlük
 * açılmaz, plan T5 tuzağı). Bilinmeyen tip ham anahtarla basılır.
 */
function projectTypeLabel(projectType: string): string {
  return PROJECT_TABS.find((tab) => tab.key === projectType)?.label ?? projectType;
}

function isNotFound(err: unknown): boolean {
  return err instanceof BackendError && err.status === 404;
}

/** Bilgi kutusu ikonu (mockup satır 54) — rengi CSS'ten, çıplak hex yok. */
function InfoIcon() {
  return (
    <svg
      className="site-form__info-icon"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 9v6M10 6.5v.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** "Bağlı Proje" bilgi kutusu (mockup satır 53–60, spec §4.0.1). */
function ProjectInfoBanner({ project }: { project: ProjectDetail | undefined }) {
  return (
    <div className="site-form__info" data-testid="site-form-project-info">
      <InfoIcon />
      <div className="site-form__info-text">
        {project ? (
          <>
            <strong>Bağlı Proje:</strong> {project.name} ({project.code}) ·{" "}
            {projectTypeLabel(project.project_type)}
            <br />
            Şantiye oluşturulduktan sonra <strong>poz dağılımı</strong> ekranından bu
            şantiyeye kota atayabilirsiniz.
          </>
        ) : (
          <span
            className="site-form__info-skeleton"
            data-testid="site-form-project-info-skeleton"
            aria-hidden="true"
          />
        )}
      </div>
      {/* Edilgen yer tutucu (§1.2): sözleşme modülü gelene kadar bağlantı yok. */}
      <span className="site-form__info-link" title={pendingModuleLabel("contracts")}>
        Poz Dağılımı →
      </span>
    </div>
  );
}

/**
 * Yeni Şantiye oluşturma yüzeyi (spec §2.2, §4.0). Bu dilimde yalnız kabuk
 * vardır: yapışkan form barı + kırıntı yolu + başlık + "Bağlı Proje" bilgi
 * kutusu + kart yuvası. Alanlar T6–T8'de, gönderim T10'da bağlanır — üç eylem
 * butonunun `onClick`'i o zamana kadar `noop`'tur (plan T5/T9).
 */
export function SiteCreateView() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);

  function handleCancel() {
    router.push(`/projeler/${projectId}`);
  }

  // T10'a kadar gönderim yok; buton yüzeyi basılır, işlev bağlanmaz (plan T9).
  function noop() {}

  if (isForbidden(projectQuery.error)) return <AccessDenied />;
  if (isNotFound(projectQuery.error)) {
    return (
      <p className="site-form__message">
        <span>Proje bulunamadı</span> — <Link href="/projeler">Projeler</Link>
      </p>
    );
  }
  if (projectQuery.isError) {
    return <p className="site-form__message">Proje yüklenemedi</p>;
  }

  const project = projectQuery.data;

  return (
    <div className="pf-shell">
      <div className="pf-topbar">
        <nav className="pf-breadcrumb" aria-label="Kırıntı yolu">
          <Link href="/projeler">Projeler</Link>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          {project ? (
            <Link href={`/projeler/${projectId}`}>{project.name}</Link>
          ) : (
            <span>…</span>
          )}
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="pf-breadcrumb__current" aria-current="page">
            Yeni Şantiye
          </span>
        </nav>
        <div className="pf-topbar__actions">
          <Button variant="secondary" className="pf-topbar-cancel" onClick={handleCancel}>
            İptal
          </Button>
          <Button variant="primary" className="pf-topbar-submit" onClick={noop}>
            Şantiyeyi Oluştur
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          <h1 className="pf-title">Yeni Şantiye Ekle</h1>
          <p className="pf-subtitle">
            Şantiye bir projeye bağlıdır — poz kotaları proje sözleşmesinden dağıtılır
          </p>
        </header>

        <ProjectInfoBanner project={project} />

        {/* Kart yuvası — T6 (bilgi/konum/takvim), T7 (bölümler), T8 (altyapı)
            bu gövdeye eklenecek; belgeler kartı T9'da bağlandı. */}
        <div className="pf-body" data-testid="site-form-body">
          <SiteDocumentsCard />
        </div>

        <SiteFormActions onCancel={handleCancel} onSaveDraft={noop} onSubmit={noop} />
      </div>
    </div>
  );
}

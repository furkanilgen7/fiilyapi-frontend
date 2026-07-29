"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { FormActions } from "./FormActions";
import "./project-form.css";

/**
 * Yeni Proje oluşturma yüzeyi (spec §4). Bu adımda (F5) sayfa kabuğu + eylemler
 * + boş gövde. Form kartları F6–F11'de, gönderim ve doğrulama F12'de eklenir.
 */
export function ProjectCreateView() {
  const router = useRouter();

  function handleCancel() {
    router.push("/projeler");
  }

  // F12: gönderim ve doğrulama bu adımda bağlanır (is_draft false/true).
  function handleSubmit() {}
  function handleSaveDraft() {}

  return (
    <div className="pf-shell">
      <div className="pf-topbar">
        <nav className="pf-breadcrumb" aria-label="Kırıntı yolu">
          <Link href="/projeler">Projeler</Link>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="pf-breadcrumb__current" aria-current="page">
            Yeni Proje
          </span>
        </nav>
        <div className="pf-topbar__actions">
          <Button
            variant="secondary"
            className="pf-topbar-cancel"
            onClick={handleCancel}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            className="pf-topbar-submit"
            onClick={handleSubmit}
          >
            Projeyi Oluştur
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          <h1 className="pf-title">Yeni Proje</h1>
          <p className="pf-subtitle">Alanlar seçime göre değişir</p>
        </header>

        {/* Kartlar F6–F11'de bu gövdeye eklenir */}
        <div className="pf-body" />

        <FormActions
          onCancel={handleCancel}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

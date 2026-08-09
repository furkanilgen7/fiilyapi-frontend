import { Fragment } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button/Button";
import { cx } from "@/lib/cx";

/** Panelin tek bir satırı — hem kök hem girintili klasör için aynı şekil. */
export interface DocumentFolderNode {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
}

/**
 * Kök satır + altındaki girintili klasörler.
 *
 * İki ekran kökü FARKLI DOLDURUR (paylaşılan tek bileşen, iki kapsam):
 * ŞB'de TEK kök vardır ("Tüm Belgeler", ŞB 42-44); E12'de her GÖRÜNÜR PROJE
 * bir köktür (spec §6 S4; E12 77/102/106/110) ve yalnız seçili projenin
 * çocukları dolu gelir.
 */
export interface DocumentFolderRoot extends DocumentFolderNode {
  children: readonly DocumentFolderNode[];
}

export interface DocumentFolderPanelProps {
  /** Panel başlığı: ŞB'de "<Şantiye adı> Klasörleri" (39), E12'de "Klasörler" (72). */
  title: string;
  roots: readonly DocumentFolderRoot[];
  /** Yükleniyor/hata/boş durumun tek satırlık Türkçe metni (çağıran hesaplar). */
  message?: string;
  canWrite: boolean;
  /** "+" düğmesi (ŞB 40 / E12 73) yeni klasör diyaloğunu açar. */
  onCreateFolderClick?: () => void;
}

/**
 * Sol klasör paneli — mockup `Şantiye - Belgeler.dc.html` (ŞB) 37-69 ve
 * `Ekran 12 - Belge Arşivi.dc.html` (E12) 68-112. İki mockup da AYNI panel
 * gövdesini çizer: 240px, "+" başlığı, kök satırı (📁) + girintili klasörler
 * (📂); tek fark köklerin ne olduğudur.
 *
 * Liste İKİ SEVİYEDİR: şema `parent_id` taşısa da daha derin bir ağaç
 * ÇİZİLMEZ — mockup'ta yoktur, icat edilmez. Klasör SAYI ROZETİ de yoktur.
 */
export function DocumentFolderPanel({
  title,
  roots,
  message,
  canWrite,
  onCreateFolderClick,
}: DocumentFolderPanelProps) {
  return (
    <nav className="sdoc-folders" aria-label="Belge klasörleri">
      {/* ŞB 38-41 · E12 71-74 */}
      <div className="sdoc-folders__head">
        <span className="sdoc-folders__heading">{title}</span>
        {canWrite && (
          <Button
            variant="ghost"
            className="sdoc-folders__add"
            aria-label="Yeni klasör"
            onClick={onCreateFolderClick}
          >
            +
          </Button>
        )}
      </div>

      {roots.map((root, index) => (
        <Fragment key={root.key}>
          {/* E12 99 — kökler arası ayırıcı; tek köklü ŞB'de hiç basılmaz */}
          {index > 0 && <div className="sdoc-folders__divider" />}

          {/* ŞB 42-44 · E12 75-78 */}
          <Link
            href={root.href}
            className={cx(
              "sdoc-folders__item",
              "sdoc-folders__item--root",
              root.isActive && "sdoc-folders__item--active",
            )}
            aria-current={root.isActive ? "page" : undefined}
          >
            <span className="sdoc-folders__icon" aria-hidden="true">
              📁
            </span>
            {root.label}
          </Link>

          {/* ŞB 45-68 · E12 79-98 — girintili klasörler */}
          {root.children.map((child) => (
            <Link
              key={child.key}
              href={child.href}
              className={cx(
                "sdoc-folders__item",
                "sdoc-folders__item--child",
                child.isActive && "sdoc-folders__item--active",
              )}
              aria-current={child.isActive ? "page" : undefined}
            >
              <span className="sdoc-folders__icon sdoc-folders__icon--sm" aria-hidden="true">
                📂
              </span>
              {child.label}
            </Link>
          ))}
        </Fragment>
      ))}

      {message && <p className="sdoc-folders__message">{message}</p>}
    </nav>
  );
}

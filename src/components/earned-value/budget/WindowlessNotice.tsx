"use client";

import Link from "next/link";

import { XIcon } from "@/components/ui/icons";

import { genitive } from "./budget-format";

interface WindowlessNoticeProps {
  disciplineName: string | null;
  /** Backend engel kodu: `missing_window` | `no_working_day` (B1-7). */
  code: string;
  boqHref: string | null;
  /** Bölümlü yaprak — pencere yoksa sebep bölümün tarihsizliğidir. */
  sectionName?: string | null;
  sectionsHref?: string | null;
}

interface NoticeText {
  title: string;
  description: string;
  action: { label: string; href: string | null } | null;
}

const BLOCKS = "bu satır dağıtılamaz, dondurma engellenir.";

function noticeText({ disciplineName, code, boqHref, sectionName, sectionsHref }: WindowlessNoticeProps): NoticeText {
  const owner = genitive(disciplineName ?? "Disiplin");
  if (code === "no_working_day") {
    return {
      title: "Penceresinde iş günü yok",
      description: `${owner} penceresi yalnız tatil ve çalışılmayan günlerden oluşuyor; ${BLOCKS}`,
      action: null,
    };
  }
  if (sectionName) {
    return {
      title: "Penceresi çıkmıyor",
      description: `${sectionName} bölümünün tarihi yok; ${BLOCKS}`,
      action: { label: "Bölüm tarihlerini düzenle →", href: sectionsHref ?? null },
    };
  }
  return {
    title: "Penceresi çıkmıyor",
    description: `${owner} hiçbir bölümde penceresi yok; ${BLOCKS}`,
    action: { label: "İş Kalemleri'nde bölüme tahsis et →", href: boqHref },
  };
}

/**
 * Ek Formlar M4 (a) — penceresi çıkmayan yaprağın ALT SATIRI (TreeTable
 * `renderRowAfter`), desen Şantiye - Günlük Kayıt (İlerleme).dc.html:241-244:
 * kırmızı kutu · başlık · açıklama · sağda bağlantı. ✕ glifi `XIcon` SVG'sidir.
 *
 * Bağlantı hedefi gerçek rotadır; şantiye henüz çözülmediyse (kök ikizde
 * seçenek yok → `projectId` bilinmez) `href` null gelir ve metin DÜZ basılır:
 * yanlış/boş bir yola götüren bağlantı uydurulmaz.
 */
export function WindowlessNotice(props: WindowlessNoticeProps) {
  const text = noticeText(props);
  return (
    <div className="ev-budget-after">
      <span className="ev-budget-after__title">
        <XIcon width={10} height={10} aria-hidden="true" />
        {text.title}
      </span>
      <span className="ev-budget-after__text">{text.description}</span>
      {text.action &&
        (text.action.href ? (
          <Link href={text.action.href} className="ev-budget-after__link">
            {text.action.label}
          </Link>
        ) : (
          <span className="ev-budget-after__link">{text.action.label}</span>
        ))}
    </div>
  );
}

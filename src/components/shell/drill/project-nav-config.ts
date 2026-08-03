import type { DrillNavGroup } from "./DrillSidebar";

export interface ProjectNavContext {
  projectId: string;
  projectName: string;
  /** Aktif şantiye — verilmezse Proje Detay seviyesindeyiz demektir */
  siteId?: string;
  siteName?: string;
}

export interface ProjectNavResult {
  backLabel: string;
  backHref: string;
  groups: DrillNavGroup[];
}

// Global modül kısayolları (spec §3.3); çoğu rota henüz yazılmadı, [...slug]
// catch-all ile ComingSoon'a düşer (F3 deseni).
const OPERATIONS_GROUPS: DrillNavGroup[] = [
  {
    heading: "SAHA & İK",
    items: [
      { label: "Puantaj", href: "/puantaj", emoji: "👷" },
      { label: "Personel", href: "/personel", emoji: "👤" },
      { label: "Makine & Ekipman", href: "/makine", emoji: "🏗" },
      { label: "Bordro", href: "/bordro", emoji: "💰" },
    ],
  },
  {
    heading: "STOK & SATINALMA",
    items: [
      { label: "Stok & Depo", href: "/stok", emoji: "📦" },
      { label: "Satınalma", href: "/satinalma", emoji: "🛒" },
    ],
  },
  {
    heading: "MALİ",
    items: [
      { label: "Sözleşmeler", href: "/sozlesmeler", emoji: "📋" },
      { label: "Taşeron Hakediş", href: "/hakedisler/taseron", emoji: "🏗" },
      { label: "İşveren Hakediş", href: "/hakedisler", emoji: "💼" },
      { label: "Muhasebe", href: "/muhasebe", emoji: "📒" },
      { label: "Hazine", href: "/hazine", emoji: "🏦" },
      { label: "Mali Tablolar", href: "/mali-tablolar", emoji: "📊" },
    ],
  },
];

/**
 * Drill sidebar geri hedefi — spec §3.1: her zaman bir seviye yukarı.
 * Şantiye aktifse bir üst seviye Proje Detay'dır (etiket proje adı);
 * değilse bir üst seviye Proje Listesi'dir (etiket "Projeler").
 */
function backTarget(ctx: ProjectNavContext): Pick<ProjectNavResult, "backLabel" | "backHref"> {
  if (ctx.siteId) {
    return { backLabel: ctx.projectName, backHref: `/projeler/${ctx.projectId}` };
  }
  return { backLabel: "Projeler", backHref: "/projeler" };
}

// Bağlam bloğunun iki öğesi de daha derin rotaların ATASIDIR ("/projeler" ⊂
// "/projeler/1" ⊂ "/projeler/1/santiyeler/9"); ön ek eşleşmesiyle üçü birden
// aktif işaretlenirdi (kod inceleme bulgusu) — bu yüzden `exact` taşırlar.
function contextGroup(ctx: ProjectNavContext): DrillNavGroup {
  return {
    heading: "PROJELER",
    items: [
      { label: "Tüm Projeler", href: "/projeler", emoji: "📁", exact: true },
      { label: ctx.projectName, href: `/projeler/${ctx.projectId}`, emoji: "●", exact: true },
    ],
  };
}

// Aktif şantiyenin 7 sekmesi (spec §3.3): Bölümler, İş Kalemleri ve
// Hakedişler kendi rotaları, kalan 4'ü henüz yazılmamış — catch-all'a düşer.
//
// "İş Kalemleri" Ekran 13 spec §2.2 ile eklendi (onaylı sapma B, §13);
// "Hakedişler" P7 T6 ile yazıldı. Sıra SiteDetailTabs.tsx ile birebir
// aynıdır — ikisi ayrışmamalıdır.
function activeSiteGroup(ctx: Required<Pick<ProjectNavContext, "siteId" | "siteName">> & ProjectNavContext): DrillNavGroup {
  const base = `/projeler/${ctx.projectId}/santiyeler/${ctx.siteId}`;
  return {
    heading: ctx.siteName,
    items: [
      { label: "Bölümler", href: base, emoji: "📍" },
      { label: "İş Kalemleri", href: `${base}/is-kalemleri`, emoji: "📐" },
      { label: "Puantaj", href: `${base}/puantaj`, emoji: "👷" },
      { label: "Stok", href: `${base}/stok`, emoji: "📦" },
      { label: "Hakedişler", href: `${base}/hakedisler`, emoji: "📋" },
      { label: "Günlük Kayıt", href: `${base}/gunluk-kayit`, emoji: "📝" },
      { label: "Belgeler", href: `${base}/belgeler`, emoji: "📄" },
    ],
  };
}

/** Proje/Şantiye drill sidebar'ının menü içeriğini kurar (spec §3.3). */
export function buildProjectNav(ctx: ProjectNavContext): ProjectNavResult {
  const groups: DrillNavGroup[] = [contextGroup(ctx)];

  if (ctx.siteId && ctx.siteName) {
    groups.push(activeSiteGroup({ ...ctx, siteId: ctx.siteId, siteName: ctx.siteName }));
  }

  groups.push(...OPERATIONS_GROUPS);

  return { ...backTarget(ctx), groups };
}

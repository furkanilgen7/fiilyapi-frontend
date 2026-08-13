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
      // F-P8 T2 · SY 40: mockup bu öğeyi PROJE bağlamındaki menüde çizer
      // (🏠 Satış Yönetimi). Drill sidebar proje bağlamının menüsüdür — öğe
      // buraya, kabuk nav'ıyla AYNI konuma (Sözleşmeler'in ardına) eklenir.
      // Rota proje-geneldir (`/satis`, spec K1); proje seçimi ekranın kendi
      // seçicisindedir.
      { label: "Satış Yönetimi", href: "/satis", emoji: "🏠" },
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

// Aktif şantiyenin 7 sekmesi (spec §3.3): F-ST T3'ten sonra HEPSİNİN gerçek
// rotası vardır — hiçbiri catch-all ComingSoon'a düşmez.
//
// "İş Kalemleri" Ekran 13 spec §2.2 ile eklendi (onaylı sapma B, §13);
// "Hakedişler" P7 T6 ile, "Günlük Kayıt" F-SD T2 ile, "Puantaj" F-PT T2 ile,
// "Belgeler" F-BC T2 ile, "Stok" F-ST T3 ile yazıldı. Sıra SiteDetailTabs.tsx ile birebir aynıdır
// — ikisi ayrışmamalıdır (`written` bayrağı orada tutulur).
function activeSiteGroup(ctx: Required<Pick<ProjectNavContext, "siteId" | "siteName">> & ProjectNavContext): DrillNavGroup {
  const base = `/projeler/${ctx.projectId}/santiyeler/${ctx.siteId}`;
  return {
    heading: ctx.siteName,
    items: [
      // "Bölümler" şantiye KÖK rotasıdır ve diğer 6 sekmenin ATASIDIR
      // (`.../s-1` ⊂ `.../s-1/gunluk-kayit`); ön ek eşleşmesiyle her alt
      // sekmede İKİ öğe birden aktif görünüyordu (F-SD T7 final review'da
      // ekran görüntüsüyle yakalandı). Bağlam grubundaki (satır 61-63) aynı
      // gerekçe buraya uygulanmamıştı — `exact` bunu kapatır.
      { label: "Bölümler", href: base, emoji: "📍", exact: true },
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

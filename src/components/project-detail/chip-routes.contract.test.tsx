/**
 * 🔴🔴 ÇİP HEDEFİ ↔ DİSKTEKİ ROTA SÖZLEŞME BEKÇİSİ (F-BLMPOZ).
 *
 * GEREKÇE ÖLÇÜLDÜ VE CANLIDA BEDELİ ÖDENDİ. `SiteCard` şantiye kartındaki dört
 * çipin üçü PROJE seviyesine gidiyordu (`/projeler/{id}/is-kalemleri`,
 * `.../isveren-hakedis`, `.../taseron-hakedis`) ve bu üç yolun ÜÇÜ DE
 * `src/app` altında YOKTU. Kullanıcı çipe basınca `(app)/[...slug]/page.tsx`
 * catch-all'ına düşüyor ve "Projeler — Bu modül yakında eklenecek." yazan bir
 * ekran görüyordu. 🔴 Bu 404'ten DAHA KÖTÜDÜR: hedef ekranlar (Ekran 13 BOQ ve
 * şantiye hakediş ekranı) ÇOKTAN YAZILMIŞTI, kullanıcıya "yok" YALANI
 * söyleniyordu.
 *
 * 🔑 CATCH-ALL YÜZÜNDEN DÖRT KAPININ HİÇBİRİ BUNU GÖREMEZ:
 *   · `typecheck` — href bir `string`, her dize geçerli.
 *   · birim testi — `render` bir `<a href>` üretir, jsdom gezinmez.
 *   · e2e — catch-all 200 döner, "sayfa açıldı" sanılır.
 *   · görsel kapı — kare çekilir, ekran "yakında" der ve KIRMIZI VERMEZ.
 * Tek çare rota kümesini DİSKTEN okuyup href'lerle karşılaştırmaktır.
 *
 * BEKÇİ İKİ YÖNLÜDÜR:
 *   ileri — basılan her `<a href>` diskte GERÇEK bir `page.tsx`e mi eşleşiyor?
 *   geri  — eşleştirici gerçekten AYIRT EDİYOR mu? (pozitif kontrol: bilinen
 *           sahte yollar REDDEDİLMELİ, bilinen gerçek yollar KABUL EDİLMELİ).
 * Tek yön yetmez: her şeye `true` diyen bozuk bir eşleştirici ileri yönü
 * sessizce yeşil geçirirdi.
 */
import { render } from "@testing-library/react";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SiteCard } from "./SiteCard";
import { ProjectDetailTabs } from "./ProjectDetailTabs";
import type { SiteListItem } from "@/lib/api/hooks/useSites";

const APP_DIR = path.join(process.cwd(), "src", "app");

/**
 * 🔴 Catch-all `[...slug]` KÜMEDEN ÇIKARILIR. İçeride bırakılırsa HER yol
 * "var" sayılır ve bekçi hiçbir şey bekçilemez — tam da bugünkü kusuru
 * gizleyen mekanizmadır.
 */
function isCatchAll(segment: string): boolean {
  return segment.startsWith("[...") || segment.startsWith("[[...");
}

/** Next.js grup segmenti `(app)` URL'de GÖRÜNMEZ. */
function isRouteGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

/** Diskteki her `page.tsx`ten URL segment desenini üretir. */
function routePatterns(): readonly (readonly string[])[] {
  const patterns: (readonly string[])[] = [];
  const walk = (dir: string, segments: readonly string[]): void => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (isCatchAll(entry)) continue;
        walk(full, isRouteGroup(entry) ? segments : [...segments, entry]);
      } else if (entry === "page.tsx") {
        patterns.push(segments);
      }
    }
  };
  walk(APP_DIR, []);
  return patterns;
}

const PATTERNS = routePatterns();

/** `[projectId]` gibi dinamik segment TEK bir boş olmayan segmenti karşılar. */
function segmentMatches(pattern: string, actual: string): boolean {
  if (pattern.startsWith("[") && pattern.endsWith("]")) return actual.length > 0;
  return pattern === actual;
}

/** Sorgu dizesi ve fragment DÜŞÜRÜLÜR — rota eşleşmesi yalnız yola bakar. */
function pathSegments(href: string): readonly string[] {
  const clean = href.split("#")[0].split("?")[0];
  return clean.split("/").filter((s) => s.length > 0);
}

function routeExists(href: string): boolean {
  const actual = pathSegments(href);
  return PATTERNS.some(
    (pattern) =>
      pattern.length === actual.length &&
      pattern.every((seg, i) => segmentMatches(seg, actual[i])),
  );
}

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const SITE_ID = "22222222-2222-4222-8222-222222222222";

const SITE: SiteListItem = {
  id: SITE_ID,
  name: "A-Blok Şantiyesi",
  address: "Kuyubaşı Mah.",
  site_manager_name: "S. Öztürk",
  status: "active",
  remaining_days: 157,
  end_date: "2026-05-01",
  section_count: 3,
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  progress_pct: { available: false, value: null, pending_module: "progress_payments" },
} as unknown as SiteListItem;

/**
 * Bir render'daki BÜTÜN bağlantı href'leri.
 *
 * 🔴 `getAllByRole("link")` KULLANILMAZ — ÖLÇÜLDÜ: `ProjectDetailTabs`
 * sekmeleri `<a role="tab">` basar, açık `role` ERİŞİLEBİLİRLİK ROLÜNÜ EZER ve
 * o bağlantılar `link` sorgusunda GÖRÜNMEZ. Rol sorgusuyla yazılsaydı bekçi
 * sekme şeridini hiç ölçmeden yeşil geçerdi (sahte-yeşil). DOM'daki `a[href]`
 * düğümleri doğrudan okunur.
 */
function renderedHrefs(ui: React.ReactElement): readonly string[] {
  const { container, unmount } = render(ui);
  const hrefs = [...container.querySelectorAll("a[href]")]
    .map((el) => el.getAttribute("href") ?? "")
    .filter((h) => h.startsWith("/"));
  unmount();
  return hrefs;
}

describe("rota kümesi diskten okunabiliyor (boş-küme korkuluğu)", () => {
  // 🔴 Korkuluk: tarama bozulur ya da `APP_DIR` kayarsa `PATTERNS` boşalır ve
  // `routeExists` her şeye `false` derdi — o hâlde aşağıdaki iddialar
  // "gürültüden kırmızı" verirdi. Ters hâl daha tehlikelidir: eşleştirici
  // gevşerse her şey `true` olur. İki uç da burada ölçülür.
  it("en az 50 gerçek rota bulunur", () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(50);
  });

  it("catch-all rotası kümeye GİRMEZ", () => {
    expect(PATTERNS.some((p) => p.some(isCatchAll))).toBe(false);
  });
});

describe("eşleştirici pozitif kontrolü (karşıt kanıt taşır)", () => {
  // Her isteğe `true` diyen bozuk bir eşleştirici bu bloktan GEÇEMEZ.
  it.each([
    `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/is-kalemleri`,
    `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/hakedisler`,
    `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`,
    "/hakedisler/taseron",
    "/belgeler",
    // F-PRJKALEM · proje sekmesinin yeni hedefi (query DÜŞÜRÜLÜR, yol kalır).
    `/sozlesmeler/isveren/${PROJECT_ID}`,
  ])("GERÇEK rota kabul edilir: %s", (href) => {
    expect(routeExists(href)).toBe(true);
  });

  it.each([
    // 🔴 Bu üçü F-BLMPOZ'dan ÖNCEKİ çip hedefleriydi. Bekçinin varlık sebebi.
    `/projeler/${PROJECT_ID}/is-kalemleri`,
    `/projeler/${PROJECT_ID}/isveren-hakedis`,
    `/projeler/${PROJECT_ID}/taseron-hakedis`,
    "/bu-rota-hicbir-zaman-yazilmadi",
    `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/is-kalemleri/fazladan-segment`,
  ])("SAHTE rota reddedilir: %s", (href) => {
    expect(routeExists(href)).toBe(false);
  });
});

describe("SiteCard çipleri — her hedef diskte VAR", () => {
  it.each(["active", "on_hold", "preparation", "completed"] as const)(
    "%s durumunda basılan her çip gerçek bir rotaya gider",
    (status) => {
      const hrefs = renderedHrefs(
        <SiteCard projectKey={PROJECT_ID} site={{ ...SITE, status }} />,
      );
      expect(hrefs.length).toBeGreaterThan(0);
      const dead = hrefs.filter((href) => !routeExists(href));
      expect(
        dead,
        dead.length === 0
          ? ""
          : [
              "Şantiye kartı çipi YAZILMAMIŞ rotaya gidiyor:",
              ...dead.map((h) => `  · ${h}`),
              "Kullanıcı bu çipe basınca `(app)/[...slug]` catch-all'ına düşer ve",
              "'Bu modül yakında eklenecek.' görür — hedef ekran YAZILMIŞ OLSA BİLE.",
              "Yapılacak: `SiteCard.tsx` içindeki `chipsFor()` hedefini diskte VAR",
              "olan bir rotaya bağla. Karşılığı gerçekten yoksa çipi SİLME —",
              "devre dışı + GÖRÜNÜR gerekçeyle bas (kanon).",
            ].join("\n"),
      ).toEqual([]);
    },
  );
});

describe("ProjectDetailTabs sekmeleri — her hedef diskte VAR", () => {
  it.each(["taahhut", "kendi_yatirim", "kat_karsiligi"] as const)(
    "%s projesinde basılan her sekme bağlantısı gerçek bir rotaya gider",
    (projectType) => {
      const hrefs = renderedHrefs(
        <ProjectDetailTabs
          projectKey={PROJECT_ID} projectId={PROJECT_ID}
          activePath={`/projeler/${PROJECT_ID}`}
          projectType={projectType}
        />,
      );
      expect(hrefs.length).toBeGreaterThan(0);
      expect(hrefs.filter((href) => !routeExists(href))).toEqual([]);
    },
  );
});

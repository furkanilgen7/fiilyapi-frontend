import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";

import { buildRouteTree, resolveHrefIn } from "./route-tree.testkit";
import { ProjectDetailTabs } from "../project-detail/ProjectDetailTabs";
import { SiteDetailTabs } from "../site-detail/SiteDetailTabs";

/**
 * KÖR BEKÇİ — sekme şeritlerinin ölü bağlantı üretmesi YAPISAL OLARAK imkânsız.
 *
 * Vaka (F-PRJTAB): proje detay sekme şeridindeki dört sekme yazılmamış rotalara
 * gidiyordu; kullanıcı tıklayınca catch-all ComingSoon (ölü sayfa) alıyordu.
 * Kök neden: üç NAV yapılandırması `route-tree.testkit`e kayıtlıyken İKİ SEKME
 * ŞERİDİ hiç kayıtlı değildi — kimse bakmadığı için sessizce çürüdü.
 *
 * İDDİA: şeritteki HER sekme ya (a) uygulamada GERÇEKTEN var olan bir rotaya
 * (page.tsx) çözülen bir bağlantıdır, ya da (b) `aria-disabled="true"`
 * işaretlidir. İkisi de değilse KIRMIZI.
 *
 * Sekmeler DOM'dan (`getAllByRole("tab")`) okunur, modülün `TABS` sabitinden
 * DEĞİL: kullanıcının tıklayabildiği şey DOM'dur; sabiti import etmek bileşenin
 * link/span kollama mantığını atlar.
 *
 * YENİ ŞERİT EKLENDİĞİNDE: aşağıdaki `STRIPS` tablosuna bir satır ekle
 * (etiket + render + beklenen sekme sayısı). Mantık kopyalanmaz.
 */

// Sentinel kimlikler: dinamik segmente düşmesine İZİN VERİLEN tek değerler.
// Ayırt edici olmaları şart — böylece "isveren" gibi UYDURMA bir sabit metin
// `[paymentId]` dinamik klasörü tarafından yutulup bekçiyi körleştiremez.
const PROJECT_SENTINEL = "__PRJ__";
const SITE_SENTINEL = "__SITE__";
const DYNAMIC_ALLOWED = new Set<string>([PROJECT_SENTINEL, SITE_SENTINEL]);

const ROUTE_TREE = buildRouteTree();

interface StripCase {
  readonly name: string;
  readonly expectedTabCount: number;
  readonly render: () => ReactElement;
}

const STRIPS: readonly StripCase[] = [
  {
    name: "ProjectDetailTabs (proje detay şeridi)",
    expectedTabCount: 5,
    render: () => (
      <ProjectDetailTabs
        projectId={PROJECT_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}`}
      />
    ),
  },
  {
    name: "SiteDetailTabs (şantiye detay şeridi)",
    expectedTabCount: 7,
    render: () => (
      <SiteDetailTabs
        projectId={PROJECT_SENTINEL}
        siteId={SITE_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}/santiyeler/${SITE_SENTINEL}`}
      />
    ),
  },
];

/** Query string ve fragment ÇÖZÜMDEN ÖNCE atılır (`/hakedisler?x=1` → `/hakedisler`). */
function pathOf(href: string): string {
  return href.split("#")[0].split("?")[0];
}

describe("Sekme şeritleri — her sekme gerçek bir rotaya gider veya devre-dışıdır", () => {
  // Ön koşul: ağaç gerçekten okunuyor mu? (bekçinin sessizce no-op'a düşmemesi)
  it("route ağacı src/app/(app) altından okunur (sağlık kontrolü)", () => {
    expect(ROUTE_TREE.literalChildren.has("hakedisler")).toBe(true);
    expect(ROUTE_TREE.literalChildren.get("hakedisler")?.dynamicChild?.name).toBe("[paymentId]");
  });

  // Genişletmenin kendisi: sentinel OLMAYAN segment dinamik klasöre düşemez.
  it("sentinel olmayan sabit metin dinamik segmente düşerse GEÇERSİZ sayılır (/hakedisler/isveren)", () => {
    expect(resolveHrefIn(ROUTE_TREE, "/hakedisler/isveren", true, DYNAMIC_ALLOWED)).toEqual({
      kind: "dynamic-fallback",
      dynamicSegmentName: "[paymentId]",
      matchedPrefix: "/hakedisler",
    });
    // Sentinel değer aynı yerde SERBESTTİR (gerçek kimlikle üretilen href).
    expect(resolveHrefIn(ROUTE_TREE, `/projeler/${PROJECT_SENTINEL}`, true, DYNAMIC_ALLOWED)).toEqual({
      kind: "static",
    });
  });

  describe.each(STRIPS)("$name", (strip) => {
    it("beklenen sayıda sekme basar (boş/vakumlu geçiş yasağı)", () => {
      render(strip.render());
      expect(screen.getAllByRole("tab")).toHaveLength(strip.expectedTabCount);
      cleanup();
    });

    it("her sekme ya var olan bir rotaya bağlanır ya da devre-dışı işaretlidir", () => {
      render(strip.render());
      const tabs = screen.getAllByRole("tab");
      // Vakumlu geçişe karşı ikinci kilit: iddia hiç sekme yokken de koşmaz.
      expect(tabs.length).toBeGreaterThanOrEqual(strip.expectedTabCount);

      for (const tab of tabs) {
        const label = tab.textContent ?? "(etiketsiz)";
        const href = tab.getAttribute("href");

        if (href === null) {
          if (tab.getAttribute("aria-disabled") !== "true") {
            throw new Error(
              `${strip.name}: "${label}" sekmesinin href'i YOK ama aria-disabled="true" de taşımıyor — ` +
                `kullanıcı hiçbir yere gitmeyen bir sekme görüyor. Ya gerçek bir rotaya bağla ya devre-dışı işaretle.`,
            );
          }
          continue;
        }

        const result = resolveHrefIn(ROUTE_TREE, pathOf(href), true, DYNAMIC_ALLOWED);
        if (result.kind === "dynamic-fallback") {
          throw new Error(
            `${strip.name}: "${label}" sekmesi (href="${href}") geçersiz — sabit metin parçası ` +
              `${result.matchedPrefix}/${result.dynamicSegmentName} dinamik rotası tarafından yutuluyor. ` +
              `Gerçek bir statik rota olmalı.`,
          );
        }
        if (result.kind === "catch-all") {
          throw new Error(
            `${strip.name}: "${label}" sekmesi (href="${href}") YAZILMAMIŞ bir rotaya gidiyor — ` +
              `[...slug] catch-all ComingSoon'a düşer (ölü sayfa). Rotayı yaz ya da sekmeyi devre-dışı bas.`,
          );
        }
        if (result.kind !== "static") {
          throw new Error(
            `${strip.name}: "${label}" sekmesi (href="${href}") geçersiz: eşleşen bir sayfa (page.tsx) yok.`,
          );
        }
      }
      cleanup();
    });
  });
});

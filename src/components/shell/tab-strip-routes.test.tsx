import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";

import { buildRouteTree, resolveHrefIn } from "./route-tree.testkit";
import { EquipmentTabsStrip } from "../equipment/EquipmentTabsStrip";
import { ProjectDetailTabs } from "../project-detail/ProjectDetailTabs";
import { SectionDetailTabs } from "../section-detail/SectionDetailTabs";
import { SiteDetailTabs } from "../site-detail/SiteDetailTabs";
import { UnitFormTabs } from "../unit-shell/UnitFormTabs";
import { BLOCK_FORM_HREF, UNIT_FORM_HREF } from "../unit-shell/routes";
import { pendingModuleLabel } from "@/lib/pending-modules";

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
  /**
   * F-UNIT1 T2 GENİŞLETMESİ — AKTİF SEKMENİN ROTASI.
   *
   * Bazı şeritler aktif sekmeyi `<Link>` DEĞİL `<span aria-selected>` olarak
   * basar: mockup öyle çizer (BE 48 / UE 51 `.tab-on` bir `<span>`dır) ve
   * `PersonnelTabsStrip` bunu F-İK'ten beri böyle yapar — aktif sekme GEZİNME
   * değil KONUM bildirir. Bu sekmenin href'i YOKTUR ama `aria-disabled` de
   * DEĞİLDİR; ikisini de sağlamayan üçüncü, MEŞRU bir hâldir.
   *
   * Bekçi bu hâli KÖR NOKTAYA çevirmez: `aria-selected="true"` bir sekmeyi
   * geçirmek için şerit, ÜZERİNDE DURDUĞU rotayı burada İDDİA ETMEK
   * ZORUNDADIR ve bekçi o rotayı dosya sistemiyle karşılaştırır. Yani şeridin
   * kendi sayfası silinir/yeniden adlandırılırsa test KIRMIZI olur.
   */
  readonly selfRoute?: string;
}

const STRIPS: readonly StripCase[] = [
  // 🔴 F-PKK — ŞERİT ARTIK PROJE TÜRÜNE GÖRE FARKLI SAYIDA SEKME BASAR, bu
  // yüzden ÜÇ TÜRÜN ÜÇÜ DE ayrı kaydedilir. Tek tur kaydetmek, yalnız o türde
  // görünen sekmelerin rotalarını denetimsiz bırakırdı — `UnitFormTabs`ın iki
  // kez kaydedilmesiyle aynı gerekçe.
  {
    name: "ProjectDetailTabs · taahhüt (proje detay şeridi)",
    expectedTabCount: 5,
    render: () => (
      <ProjectDetailTabs
        projectKey={PROJECT_SENTINEL}
        projectId={PROJECT_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}`}
        projectType="taahhut"
      />
    ),
  },
  {
    // "Proje Özeti" EKLENİR (`/projeler/{id}/ozet`), "Paylaşım Tablosu" YOK.
    name: "ProjectDetailTabs · kendi yatırım (proje detay şeridi)",
    expectedTabCount: 6,
    render: () => (
      <ProjectDetailTabs
        projectKey={PROJECT_SENTINEL}
        projectId={PROJECT_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}`}
        projectType="kendi_yatirim"
      />
    ),
  },
  {
    // İKİ sekme de EKLENİR (`/ozet` + `/paylasim`).
    name: "ProjectDetailTabs · kat karşılığı (proje detay şeridi)",
    expectedTabCount: 7,
    render: () => (
      <ProjectDetailTabs
        projectKey={PROJECT_SENTINEL}
        projectId={PROJECT_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}`}
        projectType="kat_karsiligi"
      />
    ),
  },
  {
    name: "SiteDetailTabs (şantiye detay şeridi)",
    expectedTabCount: 7,
    render: () => (
      <SiteDetailTabs
        projectKey={PROJECT_SENTINEL}
        siteKey={SITE_SENTINEL}
        activePath={`/projeler/${PROJECT_SENTINEL}/santiyeler/${SITE_SENTINEL}`}
      />
    ),
  },
  {
    // F-UNIT1 · BE 47-53 — "Blok Ekle" ekranındaki hâli.
    name: "UnitFormTabs · Blok Ekle (blok/ünite form şeridi)",
    expectedTabCount: 5,
    selfRoute: BLOCK_FORM_HREF,
    render: () => <UnitFormTabs activeTab="Blok Ekle" />,
  },
  {
    // F-UNIT1 · UE 49-55 — "Ünite Ekle" ekranındaki hâli. Aynı şerit iki kez
    // kaydedilir: her turda ÖTEKİ gerçek sekme `<Link>` olur ve rotası
    // denetlenir — tek turda biri hep `<span>` kalırdı.
    name: "UnitFormTabs · Ünite Ekle (blok/ünite form şeridi)",
    expectedTabCount: 5,
    selfRoute: UNIT_FORM_HREF,
    render: () => <UnitFormTabs activeTab="Ünite Ekle" />,
  },
  {
    // 🔴 F-KIRA — KÖR BEKÇİ KAPATILDI. Bu şerit F-MK'da yazıldığından beri
    // `STRIPS`te KAYITLI DEĞİLDİ (ölçüldü: grep boş), yani dosyanın başındaki
    // "yeni şerit eklendiğinde satır ekle" notu ATLANMIŞTI ve şeridin dört
    // gerçek rotası hiçbir bekçi tarafından denetlenmiyordu — F-PRJTAB'ın
    // kapattığı çürüme sınıfının aynısı burada AÇIK duruyordu.
    name: "EquipmentTabsStrip · Ekipman Listesi (makine sekme şeridi)",
    expectedTabCount: 5,
    selfRoute: "/makine",
    render: () => <EquipmentTabsStrip activeTab="Ekipman Listesi" />,
  },
  {
    // İkinci tur (UnitFormTabs emsali): aktif sekme `<span>` basıldığı için
    // tek turda onun rotası denetlenmez. "Kira Hakedişi" aktifken ÖTEKİ dört
    // sekme `<Link>` olur; bu tur ayrıca F-KIRA'nın açtığı `/makine/kira`
    // rotasının GERÇEKTEN var olduğunu (catch-all'a düşmediğini) çakar.
    name: "EquipmentTabsStrip · Kira Hakedişi (makine sekme şeridi)",
    expectedTabCount: 5,
    selfRoute: "/makine/kira",
    render: () => <EquipmentTabsStrip activeTab="Kira Hakedişi" />,
  },
];

/**
 * ROTASIZ ŞERİTLER (F-BOLLINK, 2026-08-17).
 *
 * Bölüm detayı şeridi `Link` DEĞİL `<button>` + yerel state kullanır — bölüm
 * seviyesinde rota yoktur (kabul edilmiş sapma, task-2-brief §Rota). Yukarıdaki
 * `StripCase` iddiası olduğu gibi uygulanamaz: hiçbir sekmenin `href`i yok ve
 * hiçbiri `aria-disabled` de değil (sekme GERÇEKTEN çalışır, yalnız içeriği
 * bölüme kırılmamıştır).
 *
 * 🔴 BEKÇİNİN ASIL İŞİ: sekmenin taşıdığı GEREKÇENİN bayatladığını yakalamak.
 * Kusurun kendisi buydu: `puantaj` ve `stok` rotaları yazıldığı hâlde şerit
 * hâlâ `pendingModule: "timesheet"/"stock"` diyor ("modül yok") ve kimse fark
 * etmiyordu. Çözüm: her sekme, içeriğini BUGÜN taşıyan şantiye seviyesi
 * rotasını `data-module-route` + `data-module-written` ile İDDİA EDER ve bekçi
 * bunu dosya sistemindeki gerçek rota ağacıyla İKİ YÖNDE karşılaştırır:
 *   - `written="true"` → rota GERÇEKTEN var olmalı (silinir/yeniden adlandırılırsa KIRMIZI)
 *   - `written="false"` → rota GERÇEKTEN olmamalı (modül yazılınca KIRMIZI ← kusurun sınıfı)
 */
interface RoutelessStripCase {
  readonly name: string;
  readonly expectedTabCount: number;
  readonly render: () => ReactElement;
}

const ROUTELESS_STRIPS: readonly RoutelessStripCase[] = [
  {
    name: "SectionDetailTabs (bölüm detay şeridi — rotasız, yerel state)",
    expectedTabCount: 5,
    render: () => (
      <SectionDetailTabs
        projectKey={PROJECT_SENTINEL}
        siteKey={SITE_SENTINEL}
        activeIndex={0}
        onSelect={() => {}}
      />
    ),
  },
];

/** `pendingModuleLabel`in genel yedeği — eşlenmemiş anahtar bununla döner. */
const PENDING_FALLBACK = pendingModuleLabel("__eslenmemis_anahtar__");

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
          // Üçüncü meşru hâl: AKTİF sekme (mockup `.tab-on` bir `<span>`dır).
          // Kör nokta olmasın diye şerit, üzerinde durduğu rotayı İDDİA EDER
          // ve o rota dosya sisteminde GERÇEKTEN var olmak zorundadır.
          if (tab.getAttribute("aria-selected") === "true") {
            if (strip.selfRoute === undefined) {
              throw new Error(
                `${strip.name}: "${label}" sekmesi aria-selected ama şerit kendi rotasını (selfRoute) ` +
                  `İDDİA ETMİYOR — aktif sekme denetlenemeyen bir kör nokta olurdu.`,
              );
            }
            expect(
              resolveHrefIn(ROUTE_TREE, pathOf(strip.selfRoute), true, DYNAMIC_ALLOWED),
              `${strip.name}: selfRoute "${strip.selfRoute}" gerçek bir sayfaya (page.tsx) çözülmüyor`,
            ).toEqual({ kind: "static" });
            continue;
          }

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

describe("Rotasız sekme şeritleri — gerekçe bayatlarsa KIRMIZI", () => {
  describe.each(ROUTELESS_STRIPS)("$name", (strip) => {
    it("beklenen sayıda sekme basar (boş/vakumlu geçiş yasağı)", () => {
      render(strip.render());
      expect(screen.getAllByRole("tab")).toHaveLength(strip.expectedTabCount);
      cleanup();
    });

    it("her sekme ya gerçek bir rotaya bağlanır ya da MAKİNEYLE DENETLENEBİLİR bir gerekçe taşır", () => {
      render(strip.render());
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThanOrEqual(strip.expectedTabCount);

      for (const tab of tabs) {
        const label = tab.textContent ?? "(etiketsiz)";
        const href = tab.getAttribute("href");
        if (href !== null) {
          // Rotalı sekme: normal şerit kuralı geçerli.
          expect(resolveHrefIn(ROUTE_TREE, pathOf(href), true, DYNAMIC_ALLOWED)).toEqual({
            kind: "static",
          });
          continue;
        }

        // BOQ-SEC-F — ÜÇÜNCÜ HÂL: sekme rotasız AMA içeriği bu ekranda
        // GERÇEKTEN basıyor (bölüm detayı · İş Kalemleri). Böyle bir sekmenin
        // "gerekçe"si olmaz; gerekçe istemek onu ölü yer tutucu sanmak olurdu.
        // 🔴 İşaret İKİ YÖNLÜ çapadır: `contentLive` konup içerik BAĞLANMAZSA
        // ekran boş kalır ve bunu `SectionDetailView.test.tsx` yakalar;
        // kaldırılıp içerik canlı kalırsa burada gerekçe istenir ve KIRMIZI olur.
        if (tab.getAttribute("data-content-live") === "true") {
          continue;
        }

        const pendingKey = tab.getAttribute("data-content-pending");
        if (!pendingKey) {
          throw new Error(
            `${strip.name}: "${label}" sekmesinin ne href'i ne de data-content-pending gerekçesi var — ` +
              `kullanıcı gerekçesiz bir yer tutucu görüyor.`,
          );
        }
        const reason = pendingModuleLabel(pendingKey);
        if (reason === PENDING_FALLBACK) {
          throw new Error(
            `${strip.name}: "${label}" sekmesinin gerekçe anahtarı ("${pendingKey}") ` +
              `pending-modules'te EŞLENMEMİŞ — kullanıcı genel yedek metni görür.`,
          );
        }

        // İKİ YÖNLÜ ÇAPA: iddia edilen şantiye seviyesi rotası ile gerçek
        // rota ağacı birbirini tutmalı. Bu iddia, "modül yazıldı ama sekme
        // hâlâ yakında diyor" çürümesini yakalar.
        const moduleRoute = tab.getAttribute("data-module-route");
        const writtenClaim = tab.getAttribute("data-module-written");
        if (!moduleRoute || (writtenClaim !== "true" && writtenClaim !== "false")) {
          throw new Error(
            `${strip.name}: "${label}" sekmesi data-module-route + data-module-written ikilisini taşımıyor — ` +
              `gerekçesi makineyle denetlenemez, sessizce bayatlayabilir.`,
          );
        }

        const resolved = resolveHrefIn(ROUTE_TREE, pathOf(moduleRoute), true, DYNAMIC_ALLOWED);
        const actuallyWritten = resolved.kind === "static";
        if (actuallyWritten !== (writtenClaim === "true")) {
          throw new Error(
            `${strip.name}: "${label}" sekmesi "${moduleRoute}" rotası için ` +
              `moduleWritten=${writtenClaim} diyor ama dosya sistemi tersini söylüyor ` +
              `(çözüm: ${resolved.kind}). ` +
              (actuallyWritten
                ? `Rota YAZILDI — sekmenin gerekçesi bayat, "modül yok" demeyi bırak.`
                : `Rota YOK — yeniden adlandırıldıysa slug'ı güncelle.`),
          );
        }
      }
      cleanup();
    });
  });
});

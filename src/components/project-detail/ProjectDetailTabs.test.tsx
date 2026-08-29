import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { employerContractTabHref } from "../contracts/employer-contract-tabs";
import { ProjectDetailTabs, WORK_ITEMS_TAB_TITLE } from "./ProjectDetailTabs";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const BASE = `/projeler/${PROJECT_ID}`;

describe("ProjectDetailTabs", () => {
  it("bes sekmeyi de gorunur basar (spec §7.3 — rotasi olmayan sekme gizlenmez)", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tablist", { name: "Proje detay sekmeleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Belgeler" })).toBeInTheDocument();
  });

  it("aktif yol Santiyeler sekmesini isaretler", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});

// 🔴 F-PRJKALEM — "Is Kalemleri" sekmesi ARTIK CANLIDIR.
//
// Eski hal sekmeyi devre-disi basiyordu; gerekce ("BOQ santiye kapsamlidir")
// YARIM DOGRU, sonuc olarak YANLISTI: proje seviyesinde BASKA bir is kalemi
// kumesi vardir ve doludur — SOZLESME POZLARI
// (`GET /projects/{project_id}/contract/items`, ekrani
// `/sozlesmeler/isveren/{projectId}?tab=items`). Santiye kartindaki cip ise
// SANTIYE BOQ'una (`/sites/{id}/boq`) gider. FARKLI KUMELERDIR.
describe("ProjectDetailTabs — Is Kalemleri sekmesi sozlesme pozlarina baglanir", () => {
  it("Is Kalemleri CANLI bir <a>'dir: aria-disabled TASIMAZ", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const tab = screen.getByRole("tab", { name: "İş Kalemleri" });
    expect(tab.tagName).toBe("A");
    expect(tab).not.toHaveAttribute("aria-disabled");
    // Eski hal `tabIndex={-1}` ile klavye sirasindan cikariyordu; <a href>
    // dogal olarak odaklanabilir, elle tabindex TASIMAZ.
    expect(tab).not.toHaveAttribute("tabindex");
  });

  // m1 bekcisi: href'ten `?tab=items` dusurulurse sekme sozlesmenin GENEL
  // sekmesine giderdi — kullanici poz tablosunu hic gormezdi.
  it("href SOZLESME DETAYININ 'items' sekmesidir (genel sekme DEGIL)", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const tab = screen.getByRole("tab", { name: "İş Kalemleri" });
    expect(tab).toHaveAttribute("href", `/sozlesmeler/isveren/${PROJECT_ID}?tab=items`);
    expect(tab.getAttribute("href")).not.toBe(employerContractTabHref(PROJECT_ID, "general"));
  });

  // m5 bekcisi: href elle yazilirsa kanonik kurucudan AYRISIR. Iddia
  // kurucunun ciktisina baglanir — kurucu degisirse burasi da tasinir.
  it("href kanonik kurucudan (employerContractTabHref) uretilir", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute(
      "href",
      employerContractTabHref(PROJECT_ID, "items"),
    );
  });

  it("proje kimligi URL'e kodlanarak yazilir (sozlesme rotasinda da)", () => {
    render(
      <ProjectDetailTabs projectKey="a b&c" projectId="a b&c" activePath="/projeler/a%20b%26c" projectType="taahhut" />,
    );
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute(
      "href",
      "/sozlesmeler/isveren/a%20b%26c?tab=items",
    );
  });

  // Gerekce notu ARTIK BASILMAZ: hicbir sekme devre-disi degil. Not kalsaydi
  // canli bir sekmenin altinda onu YALANLAYAN bir metin dururdu.
  // (5) ADAS AYRIMI: ayni ekranda ayni etiketle iki farkli kumeye gidiliyor.
  // Mockup'ta gorunur ayrim metni YOK, o yuzden `title` ile veriliyor.
  it("sekme, santiye cipiyle karismasin diye SOZLESME POZU oldugunu title'da soyler", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute(
      "title",
      WORK_ITEMS_TAB_TITLE,
    );
    // Erisilebilir ad ICERIKTEN gelir; `title` onu EZMEZ.
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveTextContent("İş Kalemleri");
  });

  it("title metninde tipografik sembol yoktur (cıplak glif yasagi)", () => {
    expect(WORK_ITEMS_TAB_TITLE).not.toMatch(/[→✓⚠≠]/u);
  });

  it("devre-disi gerekce notu EKRANDA YOKTUR", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.queryByTestId("project-tabs-work-items-reason")).toBeNull();
  });

  it("hicbir sekme devre-disi basilmaz (span/aria-disabled kalmadi)", () => {
    const { container } = render(
      <ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
    );
    expect(container.querySelectorAll('[aria-disabled]')).toHaveLength(0);
    // 🔴 Baglanti toplarken `getAllByRole("link")` KULLANILMAZ: bu sekmeler
    // acik `role="tab"` tasiyan <a>'lardir ve o sorgu onlari GORMEZ.
    const anchors = container.querySelectorAll("a[href]");
    expect(anchors).toHaveLength(screen.getAllByRole("tab").length);
  });
});

// K1: uc sekme GERCEK ekranlara gider; proje kimligi URL'de tasinir. Param
// adlari hedef ekranin BUGUN okudugu adlardir (uydurma yok).
describe("ProjectDetailTabs — yazili sekmeler gercek ekranlara baglanir", () => {
  it("Isveren Hakedis /hakedisler?project_id=... adresine gider", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
      "href",
      `/hakedisler?project_id=${PROJECT_ID}`,
    );
  });

  it("Taseron Hakedis /hakedisler/taseron?project_id=... adresine gider", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toHaveAttribute(
      "href",
      `/hakedisler/taseron?project_id=${PROJECT_ID}`,
    );
  });

  it("Belgeler /belgeler?proje=... adresine gider (ArchiveDocumentsView PROJECT_PARAM)", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
      "href",
      `/belgeler?proje=${PROJECT_ID}`,
    );
  });

  it("Santiyeler sekmesi proje detayinin kok rotasina baglanir", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute("href", BASE);
  });

  it("proje kimligi URL'e kodlanarak yazilir", () => {
    render(<ProjectDetailTabs projectKey="a b&c" projectId="a b&c" activePath="/projeler/a%20b%26c" projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
      "href",
      "/belgeler?proje=a%20b%26c",
    );
  });

  // Sekmelerin HICBIRI "yakinda" ipucu tasimaz — besinin de gercek rotasi var.
  // "İş Kalemleri"nin `title`i bir YOKLUK gerekcesi degil, ADAS AYRIMIDIR
  // (santiye cipiyle ayni etiket, farkli kume) — asagida ayrica bekcilenir.
  it("hicbir sekme 'yakinda' ipucu tasimaz — gercek rotalari var", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.getAttribute("title") ?? "").not.toMatch(/yakında|yakinda/i);
    }
    for (const label of ["Şantiyeler", "İşveren Hakediş", "Taşeron Hakediş", "Belgeler"]) {
      expect(screen.getByRole("tab", { name: label })).not.toHaveAttribute("title");
    }
  });
});

// Davranissal klavye odak testi (kod inceleme bulgusu duzeltmesi — Task 12 takibi):
// css.test.ts yalniz CSS metnini dogrular; gercek odaklanabilirlik/Tab sirasi
// jsdom + Testing Library ile burada dogrulanir.
describe("ProjectDetailTabs — klavye ile odaklanabilirlik ve sekme sirasi (davranissal)", () => {
  it("Tab ile butun BAGLANTI sekmelerine sirayla odaklanilabilir", async () => {
    const user = userEvent.setup();
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);

    // F-PRJKALEM: artik BESI de baglantidir, besi de sirada yer alir.
    const focusable = tabs.filter((tab) => tab.getAttribute("aria-disabled") !== "true");
    expect(focusable).toHaveLength(5);

    for (const tab of focusable) {
      await user.tab();
      expect(tab).toHaveFocus();
    }
  });
});

/**
 * 🔴 F-PKK K1 — İKİ SEKME PROJE TÜRÜNE GÖRE KOŞULLU.
 *
 * Yukarıdaki turlar `projectType="taahhut"` ile koşar: o tür şeridin BUGÜNKÜ
 * beş sekmesini aynen görür, yani mevcut iddialar davranış değiştirmeden
 * korunur. Aşağıdaki turlar EKLENEN sekmeleri sınar.
 *
 * Ayrımı yapan alan `project_type`tır (ölçüldü) — `land_share`/`investment`
 * kartlarının doluluğu DEĞİL: üçü de `… | null`dır ve boş bir kart sekmeleri
 * sessizce kaybettirirdi.
 */
describe("ProjectDetailTabs — tür bazlı sekmeler (F-PKK K1)", () => {
  const tabNames = () =>
    screen.getAllByRole("tab").map((tab) => tab.textContent?.trim() ?? "");

  it("taahhutte IKI YENI SEKME DE basilmaz", () => {
    render(<ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(tabNames()).toEqual([
      "Şantiyeler",
      "İş Kalemleri",
      "İşveren Hakediş",
      "Taşeron Hakediş",
      "Belgeler",
    ]);
  });

  it("kendi yatirimda YALNIZ 'Proje Ozeti' eklenir", () => {
    render(
      <ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="kendi_yatirim" />,
    );
    expect(screen.getByRole("tab", { name: "Proje Özeti" })).toHaveAttribute(
      "href",
      `${BASE}/ozet`,
    );
    // Paylaşım Tablosu kat karşılığına özgüdür: kendi yatırımda
    // `land-share/summary` 404 döner ve sekme boş bir ekrana götürürdü.
    expect(screen.queryByRole("tab", { name: "Paylaşım Tablosu" })).toBeNull();
  });

  it("kat karsiliginda IKI SEKME de eklenir ve gercek rotalara gider", () => {
    render(
      <ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
    );
    expect(screen.getByRole("tab", { name: "Proje Özeti" })).toHaveAttribute(
      "href",
      `${BASE}/ozet`,
    );
    expect(screen.getByRole("tab", { name: "Paylaşım Tablosu" })).toHaveAttribute(
      "href",
      `${BASE}/paylasim`,
    );
  });

  it("sekme SIRASI turden ture kaymaz (Santiyeler hep once)", () => {
    render(
      <ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
    );
    expect(tabNames()).toEqual([
      "Şantiyeler",
      "Proje Özeti",
      "Paylaşım Tablosu",
      "İş Kalemleri",
      "İşveren Hakediş",
      "Taşeron Hakediş",
      "Belgeler",
    ]);
  });

  it("ozet yolundayken 'Proje Ozeti' sekmesi AKTIF isaretlenir", () => {
    render(
      <ProjectDetailTabs
        projectKey={PROJECT_ID} projectId={PROJECT_ID}
        activePath={`${BASE}/ozet`}
        projectType="kat_karsiligi"
      />,
    );
    expect(screen.getByRole("tab", { name: "Proje Özeti" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  // "İş Kalemleri" her turde GORUNUR ve her turde CANLIDIR — tur suzgeci onu
  // ne kaybettirir ne de devre-disi birakir.
  it("Is Kalemleri her turde canli kalir (tur suzgeci onu etkilemez)", () => {
    for (const type of ["taahhut", "kendi_yatirim", "kat_karsiligi"] as const) {
      const { unmount } = render(
        <ProjectDetailTabs projectKey={PROJECT_ID} projectId={PROJECT_ID} activePath={BASE} projectType={type} />,
      );
      expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute(
        "href",
        employerContractTabHref(PROJECT_ID, "items"),
      );
      unmount();
    }
  });
});

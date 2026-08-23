import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectDetailTabs, WORK_ITEMS_TAB_DISABLED_HINT } from "./ProjectDetailTabs";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const BASE = `/projeler/${PROJECT_ID}`;

describe("ProjectDetailTabs", () => {
  it("bes sekmeyi de gorunur basar (spec §7.3 — rotasi olmayan sekme gizlenmez)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tablist", { name: "Proje detay sekmeleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Belgeler" })).toBeInTheDocument();
  });

  it("aktif yol Santiyeler sekmesini isaretler", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
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

// K2 + K3: "İş Kalemleri" proje seviyesinde YOKTUR (BOQ santiye kapsamli).
// Sekme silinmez ama TIKLANABILIR de degildir — olu baglanti basilmaz.
describe("ProjectDetailTabs — rotasi olmayan sekme devre-disi basilir", () => {
  it("Is Kalemleri sekmesinin href'i YOKTUR ve aria-disabled tasir", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const disabled = screen.getByRole("tab", { name: "İş Kalemleri" });
    expect(disabled).not.toHaveAttribute("href");
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(disabled.tagName).toBe("SPAN");
    expect(disabled).toHaveAttribute("title", WORK_ITEMS_TAB_DISABLED_HINT);
  });

  it("devre-disi sekme klavye sirasinda yer almaz (tabIndex -1)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "İş Kalemleri" })).toHaveAttribute("tabindex", "-1");
  });

  it("devre-disi sekmeye tiklamak gezinme uretmez (baglanti degil)", async () => {
    const user = userEvent.setup();
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const disabled = screen.getByRole("tab", { name: "İş Kalemleri" });
    await user.click(disabled);
    expect(disabled.closest("a")).toBeNull();
  });

  it("gerekce metni EKRANDA gorunur (yalniz title yetmez)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByTestId("project-tabs-work-items-reason")).toHaveTextContent(
      WORK_ITEMS_TAB_DISABLED_HINT,
    );
  });

  // Not, devre-disi sekmeden TURETILIR (sabit basilmaz): sekme ileride yazilirsa
  // not da kendiliginden kalkar. Baglantiyi burada kilitliyoruz — ayrisirlarsa
  // canli bir sekmenin altinda onu yalanlayan bir not kalabilirdi.
  it("gerekce notu devre-disi sekmenin kendi gerekcesidir (ayrisamaz)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const disabled = screen.getByRole("tab", { name: "İş Kalemleri" });
    const title = disabled.getAttribute("title");
    expect(title).toBeTruthy();
    expect(screen.getByTestId("project-tabs-work-items-reason")).toHaveTextContent(title!);
  });

  it("gerekce metninde tipografik sembol yoktur (cıplak glif yasagi)", () => {
    // Ok/onay/uyari gibi semboller fonts.css unicode-range kumelerinde kapsanmaz.
    expect(WORK_ITEMS_TAB_DISABLED_HINT).not.toMatch(/[→✓⚠≠]/u);
  });
});

// K1: uc sekme GERCEK ekranlara gider; proje kimligi URL'de tasinir. Param
// adlari hedef ekranin BUGUN okudugu adlardir (uydurma yok).
describe("ProjectDetailTabs — yazili sekmeler gercek ekranlara baglanir", () => {
  it("Isveren Hakedis /hakedisler?project_id=... adresine gider", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
      "href",
      `/hakedisler?project_id=${PROJECT_ID}`,
    );
  });

  it("Taseron Hakedis /hakedisler/taseron?project_id=... adresine gider", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Taşeron Hakediş" })).toHaveAttribute(
      "href",
      `/hakedisler/taseron?project_id=${PROJECT_ID}`,
    );
  });

  it("Belgeler /belgeler?proje=... adresine gider (ArchiveDocumentsView PROJECT_PARAM)", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
      "href",
      `/belgeler?proje=${PROJECT_ID}`,
    );
  });

  it("Santiyeler sekmesi proje detayinin kok rotasina baglanir", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute("href", BASE);
  });

  it("proje kimligi URL'e kodlanarak yazilir", () => {
    render(<ProjectDetailTabs projectId="a b&c" activePath="/projeler/a%20b%26c" projectType="taahhut" />);
    expect(screen.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
      "href",
      "/belgeler?proje=a%20b%26c",
    );
  });

  it("yazili sekmeler 'yakinda' ipucu tasimaz — gercek rotalari var", () => {
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
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
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);

    // Devre-disi sekme (tabIndex -1) siranin DISINDADIR — kalan dordu sirayla gelir.
    const focusable = tabs.filter((tab) => tab.getAttribute("aria-disabled") !== "true");
    expect(focusable).toHaveLength(4);

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
    render(<ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="taahhut" />);
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
      <ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="kendi_yatirim" />,
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
      <ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
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
      <ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
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
        projectId={PROJECT_ID}
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

  // Devre-dışı sekmenin gerekçe notu YALNIZ GÖRÜNEN sekmelerden türer; tür
  // süzgeci notu kaybettirmemeli (İş Kalemleri her türde görünür).
  it("gerekce notu tur suzgecinden sonra da basilir", () => {
    render(
      <ProjectDetailTabs projectId={PROJECT_ID} activePath={BASE} projectType="kat_karsiligi" />,
    );
    expect(screen.getByTestId("project-tabs-work-items-reason")).toHaveTextContent(
      WORK_ITEMS_TAB_DISABLED_HINT,
    );
  });
});

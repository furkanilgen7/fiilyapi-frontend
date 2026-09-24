import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton, SkeletonBlock, SkeletonBlocks, SkeletonLines, SkeletonRows } from "./Skeleton";

const rowsOf = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(".ev-skeleton__row"));
const cellsOf = (row: HTMLElement) => Array.from(row.querySelectorAll<HTMLElement>(".ev-skeleton__bar"));

describe("Skeleton (kap)", () => {
  it("status rolünde, aria-busy ve görünmez 'Yükleniyor' metniyle basılır", () => {
    render(
      <Skeleton>
        <SkeletonLines widths={["90%"]} />
      </Skeleton>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    const label = screen.getByText("Yükleniyor");
    expect(label).toHaveClass("sr-only");
    expect(status).toContainElement(label);
  });

  it("özel etiket verilince onu okutur", () => {
    render(<Skeleton label="Hafta 21 raporu hazırlanıyor" />);
    expect(screen.getByRole("status")).toHaveTextContent("Hafta 21 raporu hazırlanıyor");
  });

  it("süs parçaları ekran okuyucudan gizlenir", () => {
    const { container } = render(
      <Skeleton>
        <SkeletonBlocks count={3} height={44} />
        <SkeletonBlock height={64} variant="outlined" />
        <SkeletonLines widths={["90%", "75%"]} />
        <SkeletonRows columns="1fr 60px" count={2} />
      </Skeleton>,
    );
    const decorative = container.querySelectorAll(
      ".ev-skeleton__blocks, .ev-skeleton__block, .ev-skeleton__lines, .ev-skeleton__rows",
    );
    expect(decorative.length).toBeGreaterThanOrEqual(4);
    // kendisi ya da bir atası aria-hidden — erişilebilirlik ağacından düşer
    decorative.forEach((el) => expect(el.closest('[aria-hidden="true"]')).not.toBeNull());
    // kabın kendisi gizlenmez: status okunmalı
    expect(screen.getByRole("status").closest('[aria-hidden="true"]')).toBeNull();
  });
});

describe("SkeletonBlock / SkeletonBlocks (Panel.dc.html:433-434)", () => {
  it("SkeletonBlocks istenen sayıda dolu blok basar, yüksekliği uygular", () => {
    const { container } = render(<SkeletonBlocks count={3} height={44} />);
    const blocks = container.querySelectorAll<HTMLElement>(".ev-skeleton__block");
    expect(blocks).toHaveLength(3);
    blocks.forEach((b) => {
      expect(b).toHaveClass("ev-skeleton__block--fill");
      expect(b.style.height).toBe("44px");
    });
  });

  it("SkeletonBlock outlined varyantı sınıfını taşır", () => {
    const { container } = render(<SkeletonBlock height={64} variant="outlined" />);
    const block = container.querySelector<HTMLElement>(".ev-skeleton__block");
    expect(block).toHaveClass("ev-skeleton__block--outlined");
    expect(block?.style.height).toBe("64px");
  });
});

describe("SkeletonLines (Panel.dc.html:435)", () => {
  it("her genişlik için bir çizgi basar; yalnız ilki koyu tondadır", () => {
    const { container } = render(<SkeletonLines widths={["90%", "75%", "82%"]} />);
    const lines = Array.from(container.querySelectorAll<HTMLElement>(".ev-skeleton__line"));
    expect(lines.map((l) => l.style.width)).toEqual(["90%", "75%", "82%"]);
    expect(lines[0]).toHaveClass("ev-skeleton__bar--strong");
    expect(lines[1]).not.toHaveClass("ev-skeleton__bar--strong");
    expect(lines[2]).not.toHaveClass("ev-skeleton__bar--strong");
  });
});

describe("SkeletonRows", () => {
  it("Katalog:384-388 — count × kolon hücre, ızgara şablonu, ilk satırın ilk hücresi koyu", () => {
    const { container } = render(
      <SkeletonRows columns="1fr 60px 70px 50px" count={4} primaryWidths={["100%", "75%", "85%", "60%"]} />,
    );
    const rows = rowsOf(container);
    expect(rows).toHaveLength(4);
    rows.forEach((r) => {
      expect(r.style.gridTemplateColumns).toBe("1fr 60px 70px 50px");
      expect(cellsOf(r)).toHaveLength(4);
    });
    // yalnız birincil kolon (0) genişlik alır
    expect(rows.map((r) => cellsOf(r)[0].style.width)).toEqual(["100%", "75%", "85%", "60%"]);
    expect(cellsOf(rows[1])[1].style.width).toBe("");
    // koyu ton: yalnız ilk satır, birincil kolona kadar
    expect(cellsOf(rows[0])[0]).toHaveClass("ev-skeleton__bar--strong");
    expect(cellsOf(rows[0])[1]).not.toHaveClass("ev-skeleton__bar--strong");
    expect(cellsOf(rows[1])[0]).not.toHaveClass("ev-skeleton__bar--strong");
  });

  it("Bütçe:499-504 — içerlekli ağaç: derinlik CSS değişkenine yazılır, birincil kolon 1", () => {
    const { container } = render(
      <SkeletonRows
        columns="60px 1fr 50px 60px"
        count={4}
        primaryColumn={1}
        primaryWidths={["100%", "70%", "80%", "60%"]}
        depths={[0, 1, 2, 2]}
        density="sm"
      />,
    );
    const rows = rowsOf(container);
    expect(rows.map((r) => r.style.getPropertyValue("--ev-skeleton-depth"))).toEqual(["0", "1", "2", "2"]);
    expect(rows.map((r) => cellsOf(r)[1].style.width)).toEqual(["100%", "70%", "80%", "60%"]);
    expect(cellsOf(rows[0])[0]).toHaveClass("ev-skeleton__bar--strong");
    expect(cellsOf(rows[0])[1]).toHaveClass("ev-skeleton__bar--strong");
    expect(cellsOf(rows[0])[2]).not.toHaveClass("ev-skeleton__bar--strong");
    expect(container.querySelector(".ev-skeleton__rows")).toHaveClass("ev-skeleton__rows--sm");
  });

  it("QURR:115-117 — strong='all-rows' her satırda birincile kadar koyu; genişlikler döngüsel", () => {
    const { container } = render(
      <SkeletonRows
        columns="70px 160px repeat(8, 1fr)"
        count={3}
        primaryColumn={1}
        primaryWidths={["70%", "55%"]}
        strong="all-rows"
        density="lg"
      />,
    );
    const rows = rowsOf(container);
    rows.forEach((r) => {
      expect(cellsOf(r)).toHaveLength(10);
      expect(cellsOf(r)[0]).toHaveClass("ev-skeleton__bar--strong");
      expect(cellsOf(r)[1]).toHaveClass("ev-skeleton__bar--strong");
      expect(cellsOf(r)[2]).not.toHaveClass("ev-skeleton__bar--strong");
    });
    expect(rows.map((r) => cellsOf(r)[1].style.width)).toEqual(["70%", "55%", "70%"]);
  });
});

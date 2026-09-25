import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TreeTable, type TreeTableColumn } from "./TreeTable";
import type { TreeNode } from "./tree-rows";

interface Item {
  name: string;
  budget: string;
}

const TREE: readonly TreeNode<Item>[] = [
  {
    id: "KAB",
    data: { name: "Kaba İnşaat", budget: "27.626" },
    children: [
      {
        id: "KAB.01",
        data: { name: "Betonarme", budget: "27.626" },
        children: [
          {
            id: "KAB.01.03",
            data: { name: "Beton döküm", budget: "9.486" },
            children: [
              { id: "KAB.01.03-TML", data: { name: "Temel", budget: "2.376" } },
              { id: "KAB.01.03-K15", data: { name: "Kat 1-5 Kaba", budget: "3.420" } },
            ],
          },
        ],
      },
    ],
  },
  { id: "DUV", data: { name: "Duvar & Sıva", budget: "9.190" } },
];

const COLUMNS: readonly TreeTableColumn<Item>[] = [
  { key: "name", header: "Ad", render: (n) => n.data.name },
  {
    key: "budget",
    header: "Bütçe a-s",
    align: "right",
    mono: true,
    render: (n, depth) => `${n.data.budget}@${depth}`,
  },
];

const getLabel = (n: TreeNode<Item>) => n.data.name;

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`satır yok: ${name}`);
  return row;
}

describe("TreeTable — aç/kapa", () => {
  it("varsayılan olarak yalnız kök satırlar görünür", () => {
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" />);
    expect(screen.getByText("Kaba İnşaat")).toBeInTheDocument();
    expect(screen.getByText("Duvar & Sıva")).toBeInTheDocument();
    expect(screen.queryByText("Betonarme")).not.toBeInTheDocument();
  });

  it("chevron düğmesi aria-expanded ve '… aç/kapat' etiketi taşır; tıklayınca açılır/kapanır", async () => {
    const user = userEvent.setup();
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" />);
    const toggle = screen.getByRole("button", { name: "Kaba İnşaat aç/kapat" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Betonarme")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Betonarme")).not.toBeInTheDocument();
  });

  it("yaprak satırda chevron düğmesi YOKTUR", () => {
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" />);
    expect(screen.queryByRole("button", { name: "Duvar & Sıva aç/kapat" })).not.toBeInTheDocument();
  });

  it('defaultExpanded="all" bütün seviyeleri açar; satır sınıfı ve aria-level derinliği taşır', () => {
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" defaultExpanded="all" />,
    );
    const leaf = rowOf("Temel");
    expect(leaf).toHaveClass("tree-table__row--level-3");
    expect(leaf).toHaveClass("tree-table__row--leaf");
    expect(leaf).toHaveAttribute("aria-level", "4");
    expect(rowOf("Kaba İnşaat")).toHaveClass("tree-table__row--level-0");
    expect(rowOf("Betonarme")).toHaveAttribute("aria-level", "2");
  });

  it("defaultExpanded sayısı derinliğe göre açar", () => {
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" defaultExpanded={2} />,
    );
    expect(screen.getByText("Beton döküm")).toBeInTheDocument();
    expect(screen.queryByText("Temel")).not.toBeInTheDocument();
  });

  it("kontrollü mod: onExpandedChange yeni küme alır, girdi kümesi değişmez", async () => {
    const user = userEvent.setup();
    const expanded: ReadonlySet<string> = new Set();
    const onExpandedChange = vi.fn();
    render(
      <TreeTable
        nodes={TREE}
        columns={COLUMNS}
        getLabel={getLabel}
        variant="budget"
        ariaLabel="Bütçe"
        emptyText="Boş"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Kaba İnşaat aç/kapat" }));
    expect([...onExpandedChange.mock.calls[0][0]]).toEqual(["KAB"]);
    expect(expanded.size).toBe(0);
    // kontrollü: ebeveyn kümeyi güncellemedikçe satır açılmaz
    expect(screen.queryByText("Betonarme")).not.toBeInTheDocument();
  });

  it("collapsible=false: chevron çizilmez, ağaç tamamen açık basılır", () => {
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="progress" ariaLabel="Miktar" emptyText="Boş" collapsible={false} />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Kat 1-5 Kaba")).toBeInTheDocument();
  });
});

describe("TreeTable — kolonlar", () => {
  it("render fonksiyonu düğüm ve derinlik alır; sağ hizalı mono kolon sınıfı taşır", () => {
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="panel" ariaLabel="Panel" emptyText="Boş" defaultExpanded="all" />,
    );
    const cell = screen.getByText("2.376@3");
    expect(cell).toHaveClass("tree-table__cell--right");
    expect(cell).toHaveClass("tree-table__cell--mono");
    expect(screen.getByRole("columnheader", { name: "Bütçe a-s" })).toHaveClass("tree-table__cell--right");
  });

  it("ağaç kolonu satır başlığıdır (th scope=row) ve varyant sınıfı tabloya işlenir", () => {
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="qurr" ariaLabel="QURR" emptyText="Boş" />);
    expect(screen.getByRole("rowheader", { name: /Kaba İnşaat/ })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "QURR" })).toHaveClass("tree-table--qurr");
  });

  it("tree:true verilen kolon chevron'u taşır (ilk kolon olmak zorunda değil)", () => {
    const cols: readonly TreeTableColumn<Item>[] = [
      { key: "code", header: "Kod", render: (n) => `#${n.id}` },
      { key: "name", header: "Ad", tree: true, render: (n) => n.data.name },
    ];
    render(<TreeTable nodes={TREE} columns={cols} getLabel={getLabel} variant="qurr" ariaLabel="QURR" emptyText="Boş" />);
    const cell = screen.getByRole("button", { name: "Kaba İnşaat aç/kapat" }).closest("th, td");
    expect(cell).toHaveTextContent("Kaba İnşaat");
    expect(cell).not.toHaveTextContent("#KAB");
  });

  it("treeCellColSpan ağaç hücresini genişletir ve örtülen kolonları atlar", () => {
    const cols: readonly TreeTableColumn<Item>[] = [
      ...COLUMNS,
      { key: "extra", header: "Ek", render: (n) => `ek-${n.id}` },
    ];
    render(
      <TreeTable
        nodes={TREE}
        columns={cols}
        getLabel={getLabel}
        variant="progress"
        ariaLabel="Miktar"
        emptyText="Boş"
        treeCellColSpan={(n) => (n.children?.length ? 2 : 1)}
      />,
    );
    const head = rowOf("Kaba İnşaat");
    expect(within(head).getByRole("rowheader")).toHaveAttribute("colspan", "2");
    expect(within(head).queryByText("27.626@0")).not.toBeInTheDocument();
    expect(within(head).getByText("ek-KAB")).toBeInTheDocument();
    expect(within(rowOf("Duvar & Sıva")).getByText("9.190@0")).toBeInTheDocument();
  });

  it("headerGroups gruplu başlık satırı basar (colSpan)", () => {
    render(
      <TreeTable
        nodes={TREE}
        columns={COLUMNS}
        getLabel={getLabel}
        variant="qurr"
        ariaLabel="QURR"
        emptyText="Boş"
        headerGroups={[
          { key: "k", label: "İş kalemi", span: 1 },
          { key: "m", label: "Miktar", span: 1 },
        ]}
      />,
    );
    const group = screen.getByRole("columnheader", { name: "Miktar" });
    expect(group).toHaveAttribute("colspan", "1");
    expect(group).toHaveClass("tree-table__group-head");
  });

  it("rowClassName ek sınıfı satıra ekler", () => {
    render(
      <TreeTable
        nodes={TREE}
        columns={COLUMNS}
        getLabel={getLabel}
        variant="qurr"
        ariaLabel="QURR"
        emptyText="Boş"
        rowClassName={(n) => (n.id === "DUV" ? "qurr-total" : undefined)}
      />,
    );
    expect(rowOf("Duvar & Sıva")).toHaveClass("qurr-total");
  });

  it("veri yoksa boş durum metni tüm kolonları kaplayan tek hücrede basılır", () => {
    render(
      <TreeTable nodes={[]} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Aramaya uyan kalem yok." selectable />,
    );
    const cell = screen.getByText("Aramaya uyan kalem yok.");
    expect(cell.closest("td")).toHaveAttribute("colspan", "3");
  });
});

describe("TreeTable — 3 durumlu seçim", () => {
  it("üst satır kutusu tıklanınca bütün yapraklar seçilir, sonra kaldırılır", async () => {
    const user = userEvent.setup();
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" defaultExpanded="all" selectable />,
    );
    const parent = screen.getByRole("checkbox", { name: "Kaba İnşaat seç" });
    const temel = screen.getByRole("checkbox", { name: "Temel seç" });
    const kat = screen.getByRole("checkbox", { name: "Kat 1-5 Kaba seç" });
    expect(parent).not.toBeChecked();

    await user.click(parent);
    expect(temel).toBeChecked();
    expect(kat).toBeChecked();
    expect(parent).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Betonarme seç" })).toBeChecked();

    await user.click(parent);
    expect(temel).not.toBeChecked();
    expect(kat).not.toBeChecked();
  });

  it("bir kısmı seçiliyse üst kutular indeterminate (kısmi) olur", async () => {
    const user = userEvent.setup();
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" defaultExpanded="all" selectable />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Temel seç" }));
    const parent = screen.getByRole("checkbox", { name: "Kaba İnşaat seç" });
    expect(parent).toBePartiallyChecked();
    expect(parent).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Beton döküm seç" })).toBePartiallyChecked();
    expect(screen.getByRole("checkbox", { name: "Kat 1-5 Kaba seç" })).not.toBePartiallyChecked();

    // kısmi → tıklayınca HEPSİ seçilir (mockup 602 onCheck)
    await user.click(parent);
    expect(parent).not.toBePartiallyChecked();
    expect(parent).toBeChecked();
  });

  it("kontrollü seçim: onSelectedChange yalnız YAPRAK kimliklerini alır", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <TreeTable
        nodes={TREE}
        columns={COLUMNS}
        getLabel={getLabel}
        variant="budget"
        ariaLabel="Bütçe"
        emptyText="Boş"
        selectable
        selected={new Set(["KAB.01.03-K15"])}
        onSelectedChange={onSelectedChange}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Kaba İnşaat seç" })).toBePartiallyChecked();
    await user.click(screen.getByRole("checkbox", { name: "Kaba İnşaat seç" }));
    expect([...onSelectedChange.mock.calls[0][0]].sort()).toEqual(["KAB.01.03-K15", "KAB.01.03-TML"]);
  });

  it("selectionDisabled kutuları devre dışı bırakır (salt okunur)", () => {
    render(
      <TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="Bütçe" emptyText="Boş" selectable selectionDisabled />,
    );
    expect(screen.getByRole("checkbox", { name: "Kaba İnşaat seç" })).toBeDisabled();
  });

  it("selectable verilmezse seçim kolonu yoktur", () => {
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="panel" ariaLabel="Panel" emptyText="Boş" />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });
});

describe("TreeTable — hücre bazlı colSpan (PLN-F1.6.1 k)", () => {
  const cols: readonly TreeTableColumn<Item>[] = [
    { key: "name", header: "Ad", render: (n) => n.data.name },
    {
      key: "a",
      header: "A",
      render: (n) => `a-${n.id}`,
      colSpan: (n) => (n.id === "KAB" ? 2 : 1),
    },
    { key: "b", header: "B", render: (n) => `b-${n.id}` },
    { key: "c", header: "C", render: (n) => `c-${n.id}` },
  ];

  it("yayılan hücre colspan taşır, örttüğü kolon O SATIRDA basılmaz; diğer satırlar etkilenmez", () => {
    render(<TreeTable nodes={TREE} columns={cols} getLabel={getLabel} variant="budget" ariaLabel="B" emptyText="Boş" />);
    const kab = rowOf("Kaba İnşaat");
    expect(within(kab).getByText("a-KAB").closest("td")).toHaveAttribute("colspan", "2");
    expect(within(kab).queryByText("b-KAB")).not.toBeInTheDocument();
    expect(within(kab).getByText("c-KAB")).toBeInTheDocument();
    expect(kab.children).toHaveLength(3);
    const duv = rowOf("Duvar & Sıva");
    expect(duv.children).toHaveLength(4);
    expect(within(duv).getByText("b-DUV")).toBeInTheDocument();
  });

  it("yayılım kalan kolon sayısıyla sınırlanır; ağaç kolonunda da çalışır (treeCellColSpan ile aynı sözleşme)", () => {
    const treeCols: readonly TreeTableColumn<Item>[] = [
      { key: "name", header: "Ad", tree: true, render: (n) => n.data.name, colSpan: () => 9 },
      { key: "b", header: "B", render: (n) => `b-${n.id}` },
    ];
    render(<TreeTable nodes={TREE} columns={treeCols} getLabel={getLabel} variant="budget" ariaLabel="B" emptyText="Boş" />);
    const kab = rowOf("Kaba İnşaat");
    expect(within(kab).getByRole("rowheader")).toHaveAttribute("colspan", "2");
    expect(kab.children).toHaveLength(1);
  });
});

describe("TreeTable — satır sonrası yuva (PLN-F1.6.1 j)", () => {
  const after = (n: TreeNode<Item>) => (n.id === "KAB.01.03-TML" ? <span>Penceresi çıkmıyor</span> : null);

  it("ek satır ilgili satırın HEMEN altında, bütün kolonları (seçim dahil) kaplar ve satıra aria-describedby ile bağlanır", () => {
    render(
      <TreeTable
        nodes={TREE}
        columns={COLUMNS}
        getLabel={getLabel}
        variant="budget"
        ariaLabel="B"
        emptyText="Boş"
        defaultExpanded="all"
        selectable
        renderRowAfter={after}
      />,
    );
    const row = rowOf("Temel");
    const extra = row.nextElementSibling as HTMLElement;
    const cell = within(extra).getByText("Penceresi çıkmıyor").closest("td") as HTMLElement;
    expect(cell).toHaveAttribute("colspan", String(COLUMNS.length + 1));
    expect(row).toHaveAttribute("aria-describedby", cell.id);
    expect(cell.id).not.toBe("");
    expect(extra).toHaveClass("tree-table__after-row");
  });

  it("null dönen satıra ek satır basılmaz; describedby yok", () => {
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="B" emptyText="Boş" defaultExpanded="all" renderRowAfter={after} />);
    const row = rowOf("Kat 1-5 Kaba");
    expect(row).not.toHaveAttribute("aria-describedby");
    expect(document.querySelectorAll(".tree-table__after-row")).toHaveLength(1);
  });

  it("üst düğüm kapanınca ek satır da gizlenir", async () => {
    const user = userEvent.setup();
    render(<TreeTable nodes={TREE} columns={COLUMNS} getLabel={getLabel} variant="budget" ariaLabel="B" emptyText="Boş" defaultExpanded="all" renderRowAfter={after} />);
    expect(screen.getByText("Penceresi çıkmıyor")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Beton döküm aç/kapat" }));
    expect(screen.queryByText("Penceresi çıkmıyor")).not.toBeInTheDocument();
  });
});

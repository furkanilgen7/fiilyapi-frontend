import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  BoqAssignmentCard,
  MASKED_QUANTITY_REASON,
} from "./BoqAssignmentCard";
import { BoqItemPickerModal } from "./BoqItemPickerModal";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useReplaceBoqItemAllocations } from "@/lib/api/hooks/useBoqAllocations";
import type { BoqGroup, BoqItem } from "@/lib/api/hooks/useBoq";

/**
 * 🔴🔴 BEKÇİ — "MASKELİ VERİ EKRANI ÇÖKERTMEZ" (denetim KRİTİK, 2026-09-19).
 *
 * ## Kapatılan kusurun hikâyesi
 *
 * `lib/masked.ts::maskesiz()` maskeli bir değer görünce BİLEREK `throw` eder ve
 * bu YAZMA yolunda doğrudur (sessiz `?? "0"` görülmeyen bir sayıyı kaydeder).
 * Ama çağrıları GÖSTERİM yoluna da konmuştu: `rows.ts::sectionQuantityMap`
 * `LiveCard`ın RENDER GÖVDESİNDEN çağrılıyordu ve satır/seçici JSX'i de aynı
 * çağrıyı yapıyordu. Frontend'de hiçbir error boundary YOK (`src/app` altında
 * `error.tsx` yok) — yani `boq` kapsamı `finance` olan rol (muhasebe) "Bölüm
 * Düzenle" ekranını açtığında `quantity` `null` gelir, `maskesiz` atar, React
 * ağacı çöker ve kullanıcı **BEYAZ EKRAN** görür.
 *
 * ## Erişilebilirlik ÖLÇÜLDÜ — bu hâl teorik DEĞİL
 *
 * `SectionForm.tsx:64` `canWrite`i **`sites`** modülünden okur, `boq`dan değil;
 * `/auth/me` yükü yalnız `dict[str, AccessLevel]` taşır, KAPSAM taşımaz
 * (`auth/schemas.py:38`). `roles/service.py`nin yeni freni maskeleyen kapsam +
 * YAZAN seviyeyi aynı HÜCREDE yasaklar — ama hücreler MODÜL BAŞINADIR. Yani
 * `sites = full/all` (⇒ `canWrite === true`) ile `boq = view/finance`
 * (⇒ metraj `null`) BUGÜN atanabilir bir bileşimdir. Kart kendini savunmak
 * ZORUNDADIR.
 *
 * ## Bu dosyanın ölçtüğü kural
 *
 *  1. metraj maskeliyken bileşen RENDER EDİLİR ve ÇARPMAZ,
 *  2. sayılar "—" basılır (sahte `0` YOK),
 *  3. atama yüzeyi GÖRÜNÜR GEREKÇEYLE kapanır,
 *  4. 🔴 POZİTİF KONTROL: maskesiz veriyle sayılar GÖRÜNÜR ve kontroller AÇIK —
 *     "her şeyi gizle/kapat" hâli de 1-3'ü tek başına yeşil geçirirdi,
 *  5. 🔴 İKİNCİ POZİTİF KONTROL: `limited` kapsamı (PARA gizli, metraj GÖRÜNÜR)
 *     yazma yüzeyini KAPATMAZ — şantiye şefi fiyatı görmeden metraj atayabilir.
 *     Bu olmasaydı "maskeli gördüm, her şeyi kapat" aşırı düzeltmesi de yeşil
 *     kalırdı ve ekranı çökertmek yerine KULLANILAMAZ kılardık.
 */

vi.mock("@/lib/api/hooks/useBoq", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useBoq")>()),
  useBoq: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useBoqAllocations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useBoqAllocations")>()),
  fetchBoqItemAllocations: vi.fn(),
  useReplaceBoqItemAllocations: vi.fn(),
}));

const SITE_ID = "11111111-1111-4111-8111-111111111111";
const SECTION_ID = "22222222-2222-4222-8222-222222222222";

const ITEM_CODE = "03.001";
const ITEM_NAME = "Kat Döşemesi Betonu C25/30";
const INPUT_LABEL = `${ITEM_CODE} için bu bölüme atanan miktar`;

/** Maskesiz kalem — `boq = all`. */
function item(overrides: Partial<BoqItem> = {}): BoqItem {
  return {
    id: "bi-1",
    code: ITEM_CODE,
    description: ITEM_NAME,
    unit: "m³",
    quantity: "1900.000",
    unit_price: "1850.00",
    amount: "3515000.00",
    sort_order: 0,
    allocated_quantity: "1200.000",
    unallocated_quantity: "700.000",
    progress_pct: { available: false, value: null, pending_module: "progress_payments" },
    ...overrides,
  } as unknown as BoqItem;
}

function group(items: readonly BoqItem[]): BoqGroup {
  return {
    id: "bg-1",
    name: "BETONARME",
    sort_order: 10,
    group_total: null,
    items,
  } as unknown as BoqGroup;
}

/**
 * `boq = finance` (MUHASEBE): `operasyonel` kova gizlenir — metraj üç alanda da
 * `null`, türev `amount` de `null`. 🔴 `unit_price` GÖRÜNÜR kalır: `finance`
 * PARAYI görür, gizlenen kova metrajdır (`core/field_scope` üç kova tablosu).
 */
const FINANCE = {
  quantity: null,
  allocated_quantity: null,
  unallocated_quantity: null,
  amount: null,
} as const;

/**
 * `boq = limited` (ŞANTİYE ŞEFİ / SATINALMA): `para` kovası gizlenir — birim
 * fiyat ve tutar `null`, metraj GÖRÜNÜR.
 */
const LIMITED = { unit_price: null, amount: null } as const;

/** Süzgeçsiz (şantiye) ve süzgeçli (bölüm) yanıtları ayrı ayrı bağlar. */
function mockBoq(siteItems: readonly BoqItem[], sectionItems: readonly BoqItem[]) {
  vi.mocked(useBoq).mockImplementation(((_siteId: string, sectionId?: string) => ({
    data: { groups: [group(sectionId ? sectionItems : siteItems)], totals: {} },
    isLoading: false,
    isError: false,
  })) as unknown as typeof useBoq);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useReplaceBoqItemAllocations).mockReturnValue({
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof useReplaceBoqItemAllocations>);
});

function renderCard(canWrite = true) {
  return render(
    <BoqAssignmentCard mode="edit" siteId={SITE_ID} sectionId={SECTION_ID} canWrite={canWrite} />,
  );
}

describe("🔴 metraj MASKELİ — ekran AÇILIR, çarpmaz", () => {
  beforeEach(() => {
    mockBoq([item(FINANCE)], [item(FINANCE)]);
  });

  it("bileşen RENDER EDİLİR ve kart başlığı basılır (BEYAZ EKRAN YOK)", () => {
    expect(() => renderCard()).not.toThrow();
    expect(screen.getByText("📋 Bölüme Atanacak İş Kalemleri")).toBeInTheDocument();
  });

  it("bölümün poz SATIRI görünür kalır — kimlik alanları maskelenmez", () => {
    renderCard();
    // Satır DÜŞMEZ: süzgeçli yanıtta kalemin BULUNMASI o bölüme payı olduğunun
    // kanıtıdır (backend `service.py:250`), miktarı okunamasa bile.
    expect(screen.getByText(ITEM_NAME)).toBeInTheDocument();
    expect(screen.getByText(ITEM_CODE)).toBeInTheDocument();
  });

  it('maskeli sayılar "—" basılır — sahte 0 YOK', () => {
    renderCard();
    const row = screen.getByText(ITEM_NAME).closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent("—");
    // 🔴 Ayrışma noktası: `?? "0"` yazan bir uygulama burada "0" basardı.
    expect(row).not.toHaveTextContent(/(^|[^\d.,])0([^\d.,]|$)/);
  });

  it("miktar KUTUSU basılmaz — görülmeyen sayının üzerine yazılamaz", () => {
    renderCard();
    expect(screen.queryByLabelText(INPUT_LABEL)).not.toBeInTheDocument();
  });

  it("atama yüzeyi GÖRÜNÜR GEREKÇEYLE kapanır (canWrite true olsa bile)", () => {
    renderCard(true);
    expect(screen.getByText(MASKED_QUANTITY_REASON)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Poz Seç" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Şantiye kotasından poz seç" })).toBeDisabled();
  });
});

describe("🔴 POZİTİF KONTROL — maskesiz veri BOZULMAZ", () => {
  beforeEach(() => {
    mockBoq([item()], [item({ quantity: "480.000" })]);
  });

  it("sayılar GÖRÜNÜR: şantiye kotası ve bölüm payı basılır", () => {
    renderCard();
    const row = screen.getByText(ITEM_NAME).closest("tr");
    expect(row).toHaveTextContent("1.900");
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveValue("480.000");
  });

  it("kontroller AÇIK ve maske gerekçesi EKRANDA YOK", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "+ Poz Seç" })).toBeEnabled();
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.queryByText(MASKED_QUANTITY_REASON)).not.toBeInTheDocument();
  });
});

describe("🔴 İKİNCİ POZİTİF KONTROL — PARA maskesi yazmayı KAPATMAZ", () => {
  beforeEach(() => {
    mockBoq([item(LIMITED)], [item({ ...LIMITED, quantity: "480.000" })]);
  });

  it("şantiye şefi fiyatı görmeden metraj atayabilir", () => {
    renderCard();
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: "+ Poz Seç" })).toBeEnabled();
    expect(screen.queryByText(MASKED_QUANTITY_REASON)).not.toBeInTheDocument();
  });

  it("metraj GÖRÜNÜR, para sütunları — basar", () => {
    renderCard();
    const row = screen.getByText(ITEM_NAME).closest("tr");
    expect(row).toHaveTextContent("1.900");
    expect(row).toHaveTextContent("—");
  });
});

describe("🔴 seçici (BoqItemPickerModal) da maskeli veriyle AÇILIR", () => {
  function renderPicker(items: readonly BoqItem[], sectionQuantities = new Map<string, string | null>()) {
    render(
      <BoqItemPickerModal
        groups={[group(items)]}
        sectionQuantities={sectionQuantities}
        draft={new Map()}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
  }

  const PICKER_LABEL = `${ITEM_CODE} için bu bölüme atanacak miktar`;

  it("metraj maskeliyken çarpmaz, satır görünür ve kutu KAPALIDIR", () => {
    expect(() => renderPicker([item(FINANCE)], new Map([["bi-1", null]]))).not.toThrow();
    expect(screen.getByText(ITEM_NAME)).toBeInTheDocument();
    expect(screen.getByLabelText(PICKER_LABEL)).toBeDisabled();
  });

  it("🔴 POZİTİF KONTROL: maskesiz veriyle kutu AÇIK ve kota basılır", () => {
    renderPicker([item()]);
    expect(screen.getByLabelText(PICKER_LABEL)).toBeEnabled();
    expect(screen.getByText(ITEM_NAME).closest("tr")).toHaveTextContent("1.900");
  });
});

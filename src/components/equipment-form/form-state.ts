import type { EquipmentDetailResponse } from "@/lib/api/hooks/useEquipmentDetail";

import {
  DEPRECIATION_YEARS_DEFAULT,
  FINANCING_OPTIONS,
  FUEL_TYPE_OPTIONS,
  MAINTENANCE_PERIOD_DEFAULT,
  NORM_UNIT_OPTIONS,
  RATE_PERIOD_OPTIONS,
  type EquipmentCategory,
  type EquipmentFinancing,
  type EquipmentFuelType,
  type EquipmentMaintenancePeriod,
  type EquipmentNormUnit,
  type EquipmentOwnership,
  type EquipmentRatePeriod,
  type EquipmentStatus,
} from "./constants";

/**
 * "Depoda (Atanmadı)" seçeneğinin form değeri (M2:118 son seçenek).
 *
 * Boş dize "Seçiniz..."e aittir; ikisi de gövdede `site_id: null` üretir ama
 * EKRANDA ayrı seçeneklerdir (mockup ikisini de çiziyor) — biri "henüz karar
 * verilmedi", öbürü "bilinçli olarak depoda" der.
 */
export const SITE_UNASSIGNED_VALUE = "__depoda__";

/**
 * Formun DURUM TAŞIYAN alanları.
 *
 * ⚠️ KORUMA (personel formunun deseni): bir alanın burada karşılığı OLMASI,
 * sunucu sözleşmesinde (`EquipmentCreate`/`EquipmentUpdate`) karşılığı OLDUĞU
 * anlamına gelir. Karşılığı olmayan mockup alanları (ekipman fotoğrafı 77-81,
 * belge kutuları 131-160) burada YOKTUR — değer tutulmadığı için gövdeye
 * sızmaları FİZİKSEL OLARAK imkânsızdır.
 *
 * `monthly_capacity_hours` (MK-1 K7) ve `status_note` / `status_expected_date`
 * mockup'ta ÇİZİLİ DEĞİLDİR → forma da alınmaz; sunucu varsayılanı/mevcut
 * değeri korunur.
 */
export interface EquipmentFormValues {
  /** M2:54-66 → `ownership`. Mockup'ta "Kendi Malımız" seçilidir. */
  ownership: EquipmentOwnership;

  /* ── Ekipman bilgileri (84-89) ────────────────────────────────────────── */
  /** 84 → `name`. */
  name: string;
  /** 85 → `category`. Boş dize = "Seçiniz..." (bu seçicide boş seçenek VAR). */
  category: EquipmentCategory | "";
  /** 86 → `brand` (K7: mockup'ın tek alanı ikiye bölündü). */
  brand: string;
  /** 86 → `model`. */
  model: string;
  /** 87 → `serial_no`. */
  serialNo: string;
  /** 88 → `plate_no`. */
  plateNo: string;
  /** 89 → `model_year`. */
  modelYear: string;

  /* ── Mali bilgiler (98-110) ───────────────────────────────────────────── */
  /** 98 → `purchase_amount`. K8: `ownership === "owned"` iken ZORUNLU. */
  purchaseAmount: string;
  /** 99 → `purchase_date`. */
  purchaseDate: string;
  /**
   * 100 → `depreciation_years`. Mockup'ta boş seçenek YOK → K5 kapısı.
   * Serbest tamsayıdır: sunucudan gelen üçlü dışı bir yıl kırpılmaz.
   */
  depreciationYears: string;
  /** 101 + 108 → `supplier_id` (MK-1 K3: TEK FK, iki kontrol aynı durumu yazar). */
  supplierId: string;
  /** 102 → `financing`. Mockup'ta boş seçenek YOK → K5 kapısı. */
  financing: EquipmentFinancing;
  /** 103 → `market_value`. */
  marketValue: string;
  /** 109 → `rate_period`. Mockup'ta boş seçenek YOK → K5 kapısı. */
  ratePeriod: EquipmentRatePeriod;
  /** 110 → `rate_amount`. */
  rateAmount: string;

  /* ── Kullanım & atama (118-123) ───────────────────────────────────────── */
  /** 118 → `site_id` (K6). `""` = Seçiniz, `SITE_UNASSIGNED_VALUE` = depoda. */
  siteId: string;
  /** 119 → `operator_id`. */
  operatorId: string;
  /** 120 → `status`. Boş seçenek yok ama sunucuda NOT NULL (K5 kapısı DIŞI). */
  status: EquipmentStatus;
  /** 121 → `fuel_type`. Boş seçenek YOK ("—" = `none`) → K5 kapısı. */
  fuelType: EquipmentFuelType;
  /** 122 → `norm_consumption` (MK-1 K5: sayı). */
  normConsumption: string;
  /** 122 → `norm_unit`. Boş seçenek YOK → K5 kapısı. */
  normUnit: EquipmentNormUnit;
  /** 123 → `maintenance_period`. Boş seçenek YOK → K5 kapısı. */
  maintenancePeriod: EquipmentMaintenancePeriod;

  /** 166 → `is_company_asset` (MK-1 K8: yalnız işaret). Mockup'ta işaretli. */
  isCompanyAsset: boolean;
}

/**
 * Boş form — mockup'ın GÖSTERDİĞİ varsayılanlarla başlar. Boş seçeneği
 * olmayan seçicilerde "görünen değer" ile "form durumu" AYRIŞMAZ; ayrışsaydı
 * kullanıcı ekranda bir şey görüp başka bir şey kaydederdi.
 */
export function emptyEquipmentFormValues(): EquipmentFormValues {
  return {
    ownership: "owned", // 54 `checked`
    name: "",
    category: "",
    brand: "",
    model: "",
    serialNo: "",
    plateNo: "",
    modelYear: "",
    purchaseAmount: "",
    purchaseDate: "",
    depreciationYears: DEPRECIATION_YEARS_DEFAULT, // 100 `selected`
    supplierId: "",
    financing: FINANCING_OPTIONS[0].value, // 102 ilk seçenek
    marketValue: "",
    ratePeriod: RATE_PERIOD_OPTIONS[0].value, // 109 ilk seçenek
    rateAmount: "",
    siteId: "",
    operatorId: "",
    status: "working", // 120 `selected`
    fuelType: FUEL_TYPE_OPTIONS[0].value, // 121 ilk seçenek
    normConsumption: "",
    normUnit: NORM_UNIT_OPTIONS[0].value,
    maintenancePeriod: MAINTENANCE_PERIOD_DEFAULT, // 123 `selected`
    isCompanyAsset: true, // 166 `checked`
  };
}

/**
 * Düzenleme kipinde mevcut ekipmandan form değerlerini doldurur.
 *
 * ⚠️ Boş seçeneği OLMAYAN seçicilerde sunucu `null` ise mockup'ın gösterdiği
 * varsayılan basılır — ama bu değer KULLANICININ KARARI DEĞİLDİR ve gövdeye
 * gitmez (`omit-fields.ts` + `build-body.ts`, spec K5).
 */
export function equipmentFormValuesFromDetail(
  detail: EquipmentDetailResponse,
): EquipmentFormValues {
  return {
    ownership: detail.ownership,
    name: detail.name,
    category: detail.category,
    brand: detail.brand ?? "",
    model: detail.model ?? "",
    serialNo: detail.serial_no ?? "",
    plateNo: detail.plate_no ?? "",
    modelYear: detail.model_year === null ? "" : String(detail.model_year),
    purchaseAmount: detail.purchase_amount ?? "",
    purchaseDate: detail.purchase_date ?? "",
    depreciationYears:
      detail.depreciation_years === null
        ? DEPRECIATION_YEARS_DEFAULT
        : String(detail.depreciation_years),
    supplierId: detail.supplier_id ?? "",
    financing: detail.financing ?? FINANCING_OPTIONS[0].value,
    marketValue: detail.market_value ?? "",
    ratePeriod: detail.rate_period ?? RATE_PERIOD_OPTIONS[0].value,
    rateAmount: detail.rate_amount ?? "",
    // Kayıtlı şantiye YOKSA ekipman DEPODADIR (K6) — "Seçiniz..." boş hâline
    // düşmek, kullanıcıya hiç karar verilmemiş gibi gösterirdi.
    siteId: detail.site_id ?? SITE_UNASSIGNED_VALUE,
    operatorId: detail.operator_id ?? "",
    status: detail.status,
    fuelType: detail.fuel_type ?? FUEL_TYPE_OPTIONS[0].value,
    normConsumption: detail.norm_consumption ?? "",
    normUnit: detail.norm_unit ?? NORM_UNIT_OPTIONS[0].value,
    maintenancePeriod: detail.maintenance_period ?? MAINTENANCE_PERIOD_DEFAULT,
    isCompanyAsset: detail.is_company_asset,
  };
}

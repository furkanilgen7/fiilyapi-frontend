/**
 * Proje formu durumu ve gönderim gövdesi (spec §3.3, §4, §5).
 *
 * Tek bir `ProjectFormValues` nesnesi tüm kartların değerlerini taşır; kartlar
 * kendi dilimlerini prop olarak alır. Güncellemeler immutable (yeni nesne).
 */

import type { ProjectCreateRequest } from "@/lib/api/hooks/useProjectMutations";
import type { BudgetValues } from "./BudgetCard";
import type { ContractValues } from "./ContractCard";
import { emptyContractValues } from "./ContractCard";
import type { EmployerValues } from "./EmployerCard";
import { emptyEmployerValues } from "./EmployerCard";
import { collectSiteInputs, emptySiteRow, type SiteRow } from "./SiteRepeaterCard";
import type { InvestmentValues, LandShareValues } from "./TypeFieldGroups";
import { emptyInvestmentValues, emptyLandShareValues } from "./TypeFieldGroups";
import type { BasicInfoValues, ProjectType } from "./types";

export interface ProjectFormValues {
  projectType: ProjectType;
  basic: BasicInfoValues;
  employer: EmployerValues;
  contract: ContractValues;
  investment: InvestmentValues;
  landShare: LandShareValues;
  budget: BudgetValues;
  sites: SiteRow[];
}

function emptyBasicInfoValues(): BasicInfoValues {
  return {
    name: "",
    code: "",
    category: "",
    // Mockup satır 87'de "Aktif" seçili gelir.
    status: "active",
    city: "",
    parcel: "",
    address: "",
  };
}

function emptyBudgetValues(): BudgetValues {
  return { material: "", labor: "", subcontractor: "", overhead: "" };
}

/** Başlangıç durumu: tip `taahhut` (satır 54), şantiyelerde bir boş satır (§4.7). */
export function emptyProjectFormValues(): ProjectFormValues {
  return {
    projectType: "taahhut",
    basic: emptyBasicInfoValues(),
    employer: emptyEmployerValues(),
    contract: emptyContractValues(),
    investment: emptyInvestmentValues(),
    landShare: emptyLandShareValues(),
    budget: emptyBudgetValues(),
    sites: [emptySiteRow()],
  };
}

/** Boş/sayıya çevrilemeyen giriş `null`; aksi halde sayı. */
export function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrZero(value: string): number {
  return numberOrNull(value) ?? 0;
}

function textOrNull(value: string): string | null {
  return value.trim() || null;
}

function isInvestmentEmpty(values: InvestmentValues): boolean {
  return !values.salesTarget.trim() && !values.landCost.trim();
}

function isLandShareEmpty(values: LandShareValues): boolean {
  const { shareholders, ...text } = values;
  return (
    shareholders.length === 0 &&
    Object.values(text).every((value) => !value.trim())
  );
}

/**
 * `ProjectCreate` gövdesini kurar (spec §3.3).
 *
 * - `employer_name` YOK — işveren artık FK (`employer_id`).
 * - `code` boşken kırpılmaz/silinmez: bu `useCreateProject` içindeki
 *   `normalizeProjectCreateBody`'nin işi (F4), burada tekrarlanmaz.
 * - Tip uyumu (§3.6 kural 7) gövde kurulumunda garanti edilir: taahhüt dışı
 *   tiplerde `contract` / `employer_id` HİÇ gönderilmez.
 */
export function buildProjectCreateBody(
  values: ProjectFormValues,
  isDraft: boolean,
): ProjectCreateRequest {
  const { basic, contract } = values;
  const isContracting = values.projectType === "taahhut";

  const base: ProjectCreateRequest = {
    code: basic.code,
    name: basic.name.trim(),
    project_type: values.projectType,
    status: basic.status,
    category: textOrNull(basic.category),
    city: textOrNull(basic.city),
    parcel: textOrNull(basic.parcel),
    address: textOrNull(basic.address),
    // Proje tarihleri sözleşmeden gelir (§4.5); diğer tiplerde sözleşme yok.
    start_date: isContracting ? textOrNull(contract.startDate) : null,
    end_date: isContracting ? textOrNull(contract.endDate) : null,
    budget_lines: {
      material: numberOrZero(values.budget.material),
      labor: numberOrZero(values.budget.labor),
      subcontractor: numberOrZero(values.budget.subcontractor),
      overhead: numberOrZero(values.budget.overhead),
    },
    sites: collectSiteInputs(values.sites),
    is_draft: isDraft,
  };

  if (isContracting) {
    return {
      ...base,
      employer_id: values.employer.employerId || null,
      contract: {
        contract_no: textOrNull(contract.contractNo),
        signature_date: textOrNull(contract.signatureDate),
        amount: numberOrNull(contract.amount),
        // Yüzdeler zorunlu alanlar (şemada default'lu): boş bırakılmışsa 0.
        advance_pct: numberOrZero(contract.advancePct),
        retainage_pct: numberOrZero(contract.retainagePct),
        vat_pct: numberOrZero(contract.vatPct),
        late_penalty_daily: numberOrNull(contract.latePenaltyDaily),
        has_price_escalation: contract.hasPriceEscalation,
        // Fiyat farkı kapalıyken endeks NULL kalmak zorunda (ck_contract_escalation).
        index_type: contract.hasPriceEscalation ? contract.indexType : null,
        base_index_value: contract.hasPriceEscalation
          ? numberOrNull(contract.baseIndexValue)
          : null,
      },
    };
  }

  if (values.projectType === "kendi_yatirim") {
    if (isInvestmentEmpty(values.investment)) return base;
    return {
      ...base,
      investment: {
        sales_target: numberOrNull(values.investment.salesTarget),
        land_cost: numberOrNull(values.investment.landCost),
      },
    };
  }

  if (isLandShareEmpty(values.landShare)) return base;
  const { landShare } = values;
  return {
    ...base,
    land_share: {
      landowner_name: landShare.landownerName.trim(),
      our_share_pct: numberOrZero(landShare.ourSharePct),
      owner_share_pct: numberOrZero(landShare.ownerSharePct),
      notary_date: textOrNull(landShare.notaryDate),
      delivery_date: textOrNull(landShare.deliveryDate),
      daily_penalty: numberOrNull(landShare.dailyPenalty),
      guarantee_amount: numberOrNull(landShare.guaranteeAmount),
      shareholders: landShare.shareholders
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name.trim(),
          share_pct: numberOrZero(row.sharePct),
        })),
    },
  };
}

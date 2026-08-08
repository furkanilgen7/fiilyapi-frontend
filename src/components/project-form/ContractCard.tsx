import { Checkbox, Field, Input, Select } from "@/components/ui";
import { PRICE_INDEX_OPTIONS, type PriceIndexType } from "@/lib/contract-labels";
import { durationDays } from "./derive";

export type { PriceIndexType };

export interface ContractValues {
  contractNo: string;
  signatureDate: string;
  amount: string;
  startDate: string;
  endDate: string;
  advancePct: string;
  retainagePct: string;
  vatPct: string;
  latePenaltyDaily: string;
  hasPriceEscalation: boolean;
  indexType: PriceIndexType;
  baseIndexValue: string;
}

/** Varsayılanlar mockup satır 117–124'ten: avans 20, teminat 5, KDV 20, fiyat farkı açık. */
export function emptyContractValues(): ContractValues {
  return {
    contractNo: "",
    signatureDate: "",
    amount: "",
    startDate: "",
    endDate: "",
    advancePct: "20",
    retainagePct: "5",
    vatPct: "20",
    latePenaltyDaily: "",
    hasPriceEscalation: true,
    indexType: "ufe",
    baseIndexValue: "",
  };
}

/**
 * Endeks tipi seçenekleri — değer:etiket (mockup satır 128 sırası).
 * F-P5 T3: etiketler `lib/contract-labels.ts`e TAŞINDI (E14'ün salt-okunur
 * "Sözleşme Koşulları" bloğu aynı etiketleri basıyor); burada kopya YOK.
 */
const INDEX_OPTIONS = PRICE_INDEX_OPTIONS;

const VAT_OPTIONS = ["20", "10", "1"] as const;

type FieldErrors = Partial<Record<keyof ContractValues, string>>;

interface ContractCardProps {
  values: ContractValues;
  onChange: <K extends keyof ContractValues>(
    field: K,
    value: ContractValues[K],
  ) => void;
  errors?: FieldErrors;
}

/** Sözleşme Bilgileri kartı (mockup satır 104–131, spec §4.5). Yalnız taahhüt. */
export function ContractCard({ values, onChange, errors }: ContractCardProps) {
  const days = durationDays(values.startDate, values.endDate);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📝 Sözleşme Bilgileri</h2>

      <div className="pf-grid pf-grid--3">
        <Field label="Sözleşme No" required error={errors?.contractNo}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.contractNo}
              placeholder="SZL-2026-005"
              status={errors?.contractNo ? "error" : "default"}
              onChange={(e) => onChange("contractNo", e.target.value)}
            />
          )}
        </Field>
        <Field label="İmza Tarihi" required error={errors?.signatureDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.signatureDate}
              status={errors?.signatureDate ? "error" : "default"}
              onChange={(e) => onChange("signatureDate", e.target.value)}
            />
          )}
        </Field>
        <Field label="Sözleşme Bedeli (₺)" required error={errors?.amount}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.amount}
              placeholder="22400000"
              status={errors?.amount ? "error" : "default"}
              onChange={(e) => onChange("amount", e.target.value)}
            />
          )}
        </Field>
        <Field label="Başlangıç Tarihi" required error={errors?.startDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.startDate}
              status={errors?.startDate ? "error" : "default"}
              onChange={(e) => onChange("startDate", e.target.value)}
            />
          )}
        </Field>
        <Field label="Bitiş Tarihi" required error={errors?.endDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.endDate}
              status={errors?.endDate ? "error" : "default"}
              onChange={(e) => onChange("endDate", e.target.value)}
            />
          )}
        </Field>
        <Field label="Süre (Gün)" hint="Tarihlerden otomatik hesaplanır">
          {(control) => (
            <Input
              {...control}
              numeric
              readOnly
              value={days === null ? "" : String(days)}
            />
          )}
        </Field>
      </div>

      <div className="pf-divider" />

      <div className="pf-grid pf-grid--4">
        <Field label="Avans Oranı (%)" error={errors?.advancePct}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.advancePct}
              status={errors?.advancePct ? "error" : "default"}
              onChange={(e) => onChange("advancePct", e.target.value)}
            />
          )}
        </Field>
        <Field label="Teminat Kesintisi (%)" error={errors?.retainagePct}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.retainagePct}
              status={errors?.retainagePct ? "error" : "default"}
              onChange={(e) => onChange("retainagePct", e.target.value)}
            />
          )}
        </Field>
        <Field label="KDV Oranı (%)">
          {(control) => (
            <Select
              {...control}
              value={values.vatPct}
              onChange={(e) => onChange("vatPct", e.target.value)}
            >
              {VAT_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Gecikme Cezası (₺/gün)" error={errors?.latePenaltyDaily}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.latePenaltyDaily}
              placeholder="15000"
              status={errors?.latePenaltyDaily ? "error" : "default"}
              onChange={(e) => onChange("latePenaltyDaily", e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="pf-escalation">
        <Checkbox
          label="Fiyat farkı uygulanacak"
          checked={values.hasPriceEscalation}
          onChange={(e) => onChange("hasPriceEscalation", e.target.checked)}
        />
        {/* Kutucuk kapalıyken endeks alanları DOM'dan kaldırılır (§7.4). */}
        {values.hasPriceEscalation && (
          <div className="pf-grid pf-grid--2 pf-escalation__fields">
            <Field label="Endeks Tipi" required error={errors?.indexType}>
              {(control) => (
                <Select
                  {...control}
                  value={values.indexType}
                  status={errors?.indexType ? "error" : "default"}
                  onChange={(e) =>
                    onChange("indexType", e.target.value as PriceIndexType)
                  }
                >
                  {INDEX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Baz Endeks Değeri (D0)"
              required
              error={errors?.baseIndexValue}
            >
              {(control) => (
                <Input
                  {...control}
                  numeric
                  step="0.001"
                  value={values.baseIndexValue}
                  placeholder="1.000"
                  status={errors?.baseIndexValue ? "error" : "default"}
                  onChange={(e) => onChange("baseIndexValue", e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </div>
    </section>
  );
}

import { DateInput, Field, Input } from "@/components/ui";

/**
 * Taahhüt dışı proje tiplerinin alan grupları (§7.3). Mockup yalnız taahhüt
 * varyantını çiziyor; bu gruplar P1'in `investment` / `land_share` modelini
 * aynı `.card` kabuğunda, aynı ölçülerle gösterir. Alanları düşürmek canlı veri
 * modelini görünmez kılardı.
 */

export interface InvestmentValues {
  salesTarget: string;
  landCost: string;
}

export function emptyInvestmentValues(): InvestmentValues {
  return { salesTarget: "", landCost: "" };
}

interface InvestmentFieldsProps {
  values: InvestmentValues;
  onChange: <K extends keyof InvestmentValues>(
    field: K,
    value: InvestmentValues[K],
  ) => void;
  errors?: Partial<Record<keyof InvestmentValues, string>>;
}

/** Kendi Yatırım alanları (P1 `investment`). */
export function InvestmentFields({
  values,
  onChange,
  errors,
}: InvestmentFieldsProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">🏠 Yatırım Bilgileri</h2>
      <div className="pf-grid pf-grid--2">
        <Field label="Satış Hedefi (₺)" required error={errors?.salesTarget}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.salesTarget}
              status={errors?.salesTarget ? "error" : "default"}
              onChange={(e) => onChange("salesTarget", e.target.value)}
            />
          )}
        </Field>
        <Field label="Arsa Maliyeti (₺)" error={errors?.landCost}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.landCost}
              status={errors?.landCost ? "error" : "default"}
              onChange={(e) => onChange("landCost", e.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

// Satır eklenip silinebildiği için React key'i index olamaz (silme, sonraki
// satırları reindex eder) — her satıra oluşturulduğu anda kararlı bir istemci
// id'si verilir (react-reviewer bulgusu, bkz. SiteRepeaterCard'daki aynı desen).
let nextShareholderRowId = 0;
function createShareholderRowId(): string {
  nextShareholderRowId += 1;
  return `shareholder-row-${nextShareholderRowId}`;
}

export interface ShareholderRow {
  id: string;
  name: string;
  sharePct: string;
}

export interface LandShareValues {
  landownerName: string;
  ourSharePct: string;
  ownerSharePct: string;
  notaryDate: string;
  deliveryDate: string;
  dailyPenalty: string;
  guaranteeAmount: string;
  shareholders: ShareholderRow[];
}

export function emptyShareholderRow(): ShareholderRow {
  return { id: createShareholderRowId(), name: "", sharePct: "" };
}

export function emptyLandShareValues(): LandShareValues {
  return {
    landownerName: "",
    ourSharePct: "",
    ownerSharePct: "",
    notaryDate: "",
    deliveryDate: "",
    dailyPenalty: "",
    guaranteeAmount: "",
    shareholders: [],
  };
}

type LandShareTextErrors = Partial<
  Record<Exclude<keyof LandShareValues, "shareholders">, string>
>;

interface LandShareFieldsProps {
  values: LandShareValues;
  onChange: <K extends keyof LandShareValues>(
    field: K,
    value: LandShareValues[K],
  ) => void;
  errors?: LandShareTextErrors;
  /** Satır index'ine hizalı hissedar payı hataları. */
  shareholderErrors?: (string | null)[];
}

/** Kat Karşılığı alanları (P1 `land_share`), §7.3'te sıralanan alanlar. */
export function LandShareFields({
  values,
  onChange,
  errors,
  shareholderErrors,
}: LandShareFieldsProps) {
  function updateShareholder(index: number, patch: Partial<ShareholderRow>) {
    onChange(
      "shareholders",
      values.shareholders.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">🤝 Kat Karşılığı Bilgileri</h2>
      <div className="pf-grid pf-grid--3">
        <Field label="Arsa Sahibi" required error={errors?.landownerName}>
          {(control) => (
            <Input
              {...control}
              value={values.landownerName}
              status={errors?.landownerName ? "error" : "default"}
              onChange={(e) => onChange("landownerName", e.target.value)}
            />
          )}
        </Field>
        <Field label="Müteahhit Payı (%)" required error={errors?.ourSharePct}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.ourSharePct}
              status={errors?.ourSharePct ? "error" : "default"}
              onChange={(e) => onChange("ourSharePct", e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Arsa Sahibi Payı (%)"
          required
          error={errors?.ownerSharePct}
        >
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.ownerSharePct}
              status={errors?.ownerSharePct ? "error" : "default"}
              onChange={(e) => onChange("ownerSharePct", e.target.value)}
            />
          )}
        </Field>
        <Field label="Noter Tarihi" error={errors?.notaryDate}>
          {(control) => (
            <DateInput
              {...control}
              value={values.notaryDate}
              onValueChange={(iso) => onChange("notaryDate", iso)}
            />
          )}
        </Field>
        <Field label="Teslim Tarihi" error={errors?.deliveryDate}>
          {(control) => (
            <DateInput
              {...control}
              value={values.deliveryDate}
              onValueChange={(iso) => onChange("deliveryDate", iso)}
            />
          )}
        </Field>
        <Field label="Günlük Ceza (₺/gün)" error={errors?.dailyPenalty}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.dailyPenalty}
              onChange={(e) => onChange("dailyPenalty", e.target.value)}
            />
          )}
        </Field>
        <Field label="Teminat (₺)" error={errors?.guaranteeAmount}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.guaranteeAmount}
              onChange={(e) => onChange("guaranteeAmount", e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="pf-divider" />
      <h3 className="pf-subtitle pf-subheading">Hissedarlar</h3>
      <div className="pf-sites">
        {values.shareholders.map((row, index) => (
          <div className="pf-shareholder-row" key={row.id}>
            <Field label="Hissedar Adı">
              {(control) => (
                <Input
                  {...control}
                  value={row.name}
                  onChange={(e) => updateShareholder(index, { name: e.target.value })}
                />
              )}
            </Field>
            <Field label="Pay (%)" required error={shareholderErrors?.[index] ?? undefined}>
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={row.sharePct}
                  status={shareholderErrors?.[index] ? "error" : "default"}
                  onChange={(e) =>
                    updateShareholder(index, { sharePct: e.target.value })
                  }
                />
              )}
            </Field>
            <button
              type="button"
              className="pf-site-row__del"
              aria-label="Hissedar satırını sil"
              onClick={() =>
                onChange(
                  "shareholders",
                  values.shareholders.filter((_, i) => i !== index),
                )
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="pf-site-add"
          onClick={() =>
            onChange("shareholders", [
              ...values.shareholders,
              emptyShareholderRow(),
            ])
          }
        >
          + Hissedar Ekle
        </button>
      </div>
    </section>
  );
}

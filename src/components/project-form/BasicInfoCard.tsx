import { Field, Input, Select, Textarea } from "@/components/ui";
import type { BasicInfoValues, ProjectStatusOption } from "./types";

/** category seçenekleri (spec §4.4 notu): "Ticari / Ofis" tek değer olarak saklanır. */
const CATEGORY_OPTIONS = [
  "Konut",
  "Ticari / Ofis",
  "Endüstriyel",
  "Altyapı",
  "Restorasyon",
] as const;

/** Durum: yalnız üç seçenek; `completed` açılırda yok ama backend'de var (§7.2). */
const STATUS_OPTIONS: readonly { value: ProjectStatusOption; label: string }[] = [
  { value: "planning", label: "Planlama" },
  { value: "active", label: "Aktif" },
  { value: "on_hold", label: "Beklemede" },
];

type FieldErrors = Partial<Record<keyof BasicInfoValues, string>>;

interface BasicInfoCardProps {
  values: BasicInfoValues;
  onChange: <K extends keyof BasicInfoValues>(
    field: K,
    value: BasicInfoValues[K],
  ) => void;
  errors?: FieldErrors;
}

/** Temel Bilgiler kartı (mockup satır 81–92, spec §4.4). */
export function BasicInfoCard({ values, onChange, errors }: BasicInfoCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📋 Temel Bilgiler</h2>
      <div className="pf-grid pf-grid--2-1">
        <Field label="Proje Adı" required error={errors?.name}>
          {(control) => (
            <Input
              {...control}
              value={values.name}
              placeholder="Güneşkent Konut Kompleksi"
              status={errors?.name ? "error" : "default"}
              onChange={(e) => onChange("name", e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Proje Kodu"
          hint="Boş bırakılırsa otomatik"
          error={errors?.code}
        >
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.code}
              placeholder="PRJ-2026-005"
              onChange={(e) => onChange("code", e.target.value)}
            />
          )}
        </Field>
        <Field label="Tür" required error={errors?.category}>
          {(control) => (
            <Select
              {...control}
              value={values.category}
              status={errors?.category ? "error" : "default"}
              onChange={(e) => onChange("category", e.target.value)}
            >
              <option value="">Seçiniz…</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Durum">
          {(control) => (
            <Select
              {...control}
              value={values.status}
              onChange={(e) =>
                onChange("status", e.target.value as ProjectStatusOption)
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="İl / İlçe" required error={errors?.city}>
          {(control) => (
            <Input
              {...control}
              value={values.city}
              placeholder="Çankaya / Ankara"
              status={errors?.city ? "error" : "default"}
              onChange={(e) => onChange("city", e.target.value)}
            />
          )}
        </Field>
        <Field label="Ada / Parsel" error={errors?.parcel}>
          {(control) => (
            <Input
              {...control}
              numeric
              value={values.parcel}
              placeholder="1234 / 5"
              onChange={(e) => onChange("parcel", e.target.value)}
            />
          )}
        </Field>
        <Field label="Açık Adres" className="pf-col-span-2" error={errors?.address}>
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              value={values.address}
              placeholder="Mahalle, Cadde, No"
              onChange={(e) => onChange("address", e.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

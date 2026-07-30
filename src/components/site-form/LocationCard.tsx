import { Field, Input, Textarea } from "@/components/ui";
import type { SiteFormValues } from "./form-state";

type FieldErrors = Partial<Record<keyof SiteFormValues, string>>;

export interface LocationCardProps {
  values: SiteFormValues;
  onChange: <K extends keyof SiteFormValues>(field: K, value: SiteFormValues[K]) => void;
  errors?: FieldErrors;
}

/** 🗺 Konum & Alan kartı (mockup satır 76–88, spec §4.2). */
export function LocationCard({ values, onChange, errors }: LocationCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">🗺 Konum &amp; Alan</h2>
      <div className="pf-grid pf-grid--3">
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

        <Field label="Mahalle">
          {(control) => (
            <Input
              {...control}
              value={values.neighborhood}
              placeholder="Kuyubaşı Mah."
              onChange={(e) => onChange("neighborhood", e.target.value)}
            />
          )}
        </Field>

        <Field label="Ada / Parsel">
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

        <Field label="Açık Adres" className="pf-col-span-2">
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              value={values.address}
              placeholder="Cadde, sokak, no"
              onChange={(e) => onChange("address", e.target.value)}
            />
          )}
        </Field>

        {/* GPS DÜZ METİNDİR (spec §4.2.1, plan TZ-8): ayrıştırma, regex,
            normalleştirme ve hata mesajı YOKTUR. İpucu alanın amacını
            anlatır — kural üretmez. */}
        <Field label="GPS Koordinatı" hint="Puantaj konum doğrulaması için">
          {(control) => (
            <Input
              {...control}
              type="text"
              numeric
              value={values.gpsCoordinates}
              placeholder="39.9042, 32.8597"
              onChange={(e) => onChange("gpsCoordinates", e.target.value)}
            />
          )}
        </Field>

        <Field label="Arsa Alanı (m²)">
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.landAreaM2}
              placeholder="2840"
              onChange={(e) => onChange("landAreaM2", e.target.value)}
            />
          )}
        </Field>

        <Field label="İnşaat Alanı (m²)" required error={errors?.constructionAreaM2}>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.constructionAreaM2}
              placeholder="6420"
              status={errors?.constructionAreaM2 ? "error" : "default"}
              onChange={(e) => onChange("constructionAreaM2", e.target.value)}
            />
          )}
        </Field>

        {/* "Kat Sayısı" METİNDİR: "2 bodrum + 10 normal" gibi değerler girilir
            (`floor_info`), sayı alanı değildir. */}
        <Field label="Kat Sayısı">
          {(control) => (
            <Input
              {...control}
              type="text"
              value={values.floorInfo}
              placeholder="2 bodrum + 10 normal"
              onChange={(e) => onChange("floorInfo", e.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

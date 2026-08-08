import { Field, Input, Textarea } from "@/components/ui";

import { PENDING_NO_CONTRACT_FIELD } from "./constants";

/**
 * 📞 İletişim Bilgileri (mockup satır 74–83) — kartın TAMAMI PENDING.
 *
 * `PersonnelCreate` hiçbir iletişim alanı taşımaz; kart SİLİNMEZ (üst kural),
 * mockup'taki beş alan ve `*` işaretleriyle basılır ama doldurulamaz. Gerekçe
 * kart başlığının yanında GÖRÜNÜR yazar (`title` içinde saklı kalmaz).
 */
export function ContactCard() {
  return (
    <section className="pf-card">
      {/* 75 */}
      <h2 className="pf-card__title">
        <span>📞 İletişim Bilgileri</span>
        <span className="pf-card__note">
          Bu kartın alanları devre dışı — {PENDING_NO_CONTRACT_FIELD.toLocaleLowerCase("tr")}.
        </span>
      </h2>

      {/* 76 */}
      <div className="pf-grid pf-grid--2">
        {/* 77 */}
        <Field label="Cep Telefonu" required>
          {(control) => (
            <Input
              {...control}
              type="tel"
              disabled
              readOnly
              value=""
              placeholder="0532 123 45 67"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 78 */}
        <Field label="E-posta">
          {(control) => (
            <Input
              {...control}
              type="email"
              disabled
              readOnly
              value=""
              placeholder="mehmet@example.com"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 79 — iki sütun genişliğinde textarea (rows=2) */}
        <Field label="Adres" required className="pf-col-span-2">
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              disabled
              readOnly
              value=""
              placeholder="Mahalle, Sokak, No, İlçe / İl"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 80 */}
        <Field label="Acil Durum Kişisi" required>
          {(control) => (
            <Input
              {...control}
              disabled
              readOnly
              value=""
              placeholder="Ayşe Yılmaz (Eş)"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 81 */}
        <Field label="Acil Durum Telefonu" required>
          {(control) => (
            <Input
              {...control}
              type="tel"
              disabled
              readOnly
              value=""
              placeholder="0533 987 65 43"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>
      </div>
    </section>
  );
}

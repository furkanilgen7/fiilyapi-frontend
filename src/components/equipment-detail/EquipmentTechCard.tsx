import { formatDecimal } from "@/lib/format";
import type { EquipmentResponse } from "@/lib/api/hooks/useEquipment";

import { DetailKv } from "./DetailKv";
import { FUEL_TYPE_LABELS, NORM_UNIT_SUFFIX } from "./equipment-detail-labels";

/**
 * MD:116-122 · ⚙️ Teknik Bilgiler.
 *
 * SEKİZ satırın hepsi `EquipmentResponse`ta SAKLANIR — bu kartta tek bir türev
 * yoktur. `Yakıt Normu` satırı iki alandan (`norm_consumption` + `norm_unit`)
 * oluşur ve BİRİ eksikse satır boştur: birimi bilinmeyen bir norm sayısı
 * "4,2" diye basılsaydı Lt/saat mi Lt/km mi olduğu okunamazdı.
 */
export function EquipmentTechCard({ equipment }: { equipment: EquipmentResponse }) {
  const brandModel = [equipment.brand, equipment.model].filter(Boolean).join(" ");
  const norm =
    equipment.norm_consumption !== null && equipment.norm_unit !== null
      ? `${formatDecimal(equipment.norm_consumption, 2)} ${NORM_UNIT_SUFFIX[equipment.norm_unit]}`
      : null;

  return (
    <section className="makine-det__card" aria-label="Teknik Bilgiler">
      <h2 className="makine-det__card-title">⚙️ Teknik Bilgiler</h2>
      <DetailKv label="Marka / Model" value={brandModel || null} />
      <DetailKv
        label="Üretim Yılı"
        value={equipment.model_year === null ? null : String(equipment.model_year)}
        tones={["mono"]}
      />
      <DetailKv label="Seri No" value={equipment.serial_no} tones={["mono"]} />
      <DetailKv label="Plaka / Tescil No" value={equipment.plate_no} tones={["mono"]} />
      <DetailKv
        label="Motor Gücü"
        value={
          equipment.engine_power_kw === null
            ? null
            : `${formatDecimal(equipment.engine_power_kw, 2)} kW`
        }
      />
      <DetailKv label="Kapasite" value={equipment.capacity_description} />
      {/* MD:120 — mockup yalnız `Lt/saat` çiziyor; `lt_km` sunucuda VARDIR
          (K3'ün en kritik yolu) ve eki alandan türer, koda gömülmez. */}
      <DetailKv label="Yakıt Normu" value={norm} testId="makine-det-norm" />
      {/* MD:121 mockup'ta olmayan ama künyede duran alan: yakıt TÜRÜ. Mockup
          öğesi EKLENMEDİ — bu satır `Yakıt Normu`nun birimini okunur kılan
          bağlamdır ve sunucuda zorunlu değildir; yoksa hiç basılmaz. */}
      {equipment.fuel_type !== null && (
        <DetailKv label="Yakıt Türü" value={FUEL_TYPE_LABELS[equipment.fuel_type]} />
      )}
      <DetailKv
        label="Hourmeter (Toplam)"
        value={
          equipment.hourmeter_hours === null
            ? null
            : `${formatDecimal(equipment.hourmeter_hours, 2)} saat`
        }
        tones={["mono"]}
      />
    </section>
  );
}

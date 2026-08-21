/**
 * F-UNIT2 · PG 101 "Otomatik Dağıt (%55/%45)" — SAF istemci türevi.
 *
 * 🔴 SUNUCUDA BÖYLE BİR UÇ YOKTUR (ölçüldü: `units/allocation` yalnız AÇIK bir
 * satır listesi alır). Bu işlev YALNIZ BEKLEYEN atama üretir; kullanıcı
 * "Paylaşımı Kaydet" demeden sunucuya hiçbir şey gitmez. Senkrondur, ağ
 * çağrısı yapmaz, `LandShareUnitRow` satırlarına DOKUNMAZ.
 *
 * 🔴 HEDEF ADETLER SUNUCUDAN GELİR, BURADA HESAPLANMAZ.
 * `LandShareCountBalance.our_expected_count` / `.owner_expected_count`
 * sunucuda TEK yuvarlamadan türer (*"owner = toplam − our"*) ve bu yüzden
 * toplamları daima ünite adedine eşittir. İstemci aynı yuvarlamayı yeniden
 * yazsaydı 42 üniteyi 23+20=43 yapan ikinci bir hesap doğardı — bir eşik iki
 * yerde yaşarsa ayrışır.
 *
 * 🔴 RAYİÇ DEĞERİ OLMAYAN ÜNİTE SIFIR SAYILMAZ. `appraisal_value` `null`
 * "girilmemiş" demektir, "sıfır lira" değil. Sıfır sayılsaydı bu üniteler
 * daima değer açığı en büyük tarafa yığılır ve DEĞER DENGESİ sessizce
 * bozulurdu. Bunun yerine dağıtımın DIŞINDA bırakılır ve kullanıcıya
 * bildirilir (elle atanırlar) — `LandShareValueBalance`ın kendi kararıyla
 * aynı sınıf: hesaplanamayan bir sayı UYDURULMAZ.
 *
 * ⚠️ SIRALAMA SEZGİSELDİR. Rayiç değerler yalnız KARŞILAŞTIRILIR (hangi taraf
 * hedef orandan daha geride?), hiçbir para değeri HESAPLANIP saklanmaz ya da
 * ekrana basılmaz: bu işlevin tek çıktısı `unit_id → owner_side` eşlemesidir.
 * Bu yüzden karşılaştırmalar `Number` üzerinde yapılır; kuruş kaybı diye bir
 * risk yoktur çünkü hiçbir kuruş taşınmaz. Gerçek değer dengesi kaydettikten
 * sonra SUNUCUDAN gelir (`LandShareValueBalance`).
 */

import {
  ALLOCATION_LEFT_UNASSIGNED_MESSAGE,
  ALLOCATION_SKIPPED_WITHOUT_VALUE_MESSAGE,
} from "./constants";
import {
  effectiveAllocation,
  type AllocationState,
  type LandShareUnitRow,
  type UnitOwnerSide,
} from "./allocation-state";

export interface AutoDistributeInput {
  /** GÖRÜNEN satırlar — dağıtım yalnız bunlar üzerinde çalışır. */
  rows: readonly LandShareUnitRow[];
  /** Mevcut bekleyen durum; önceki atamalar KORUNUR ve atanmış SAYILIR. */
  state: AllocationState;
  /** `LandShareContract.our_share_pct` — SUNUCUDAN (örn. "55.00"). */
  ourSharePct: string;
  /** `LandShareCountBalance.our_expected_count` — SUNUCUDAN. */
  ourExpectedCount: number;
  /** `LandShareCountBalance.owner_expected_count` — SUNUCUDAN. */
  ownerExpectedCount: number;
}

export interface AutoDistributeResult {
  /** YENİ bekleyen durum. Sunucuya hiçbir şey yazılmadı. */
  state: AllocationState;
  assignedToUs: readonly string[];
  assignedToOwner: readonly string[];
  /** Rayiç değeri OLMAYAN üniteler — 0 sayılmadı, dağıtıma girmedi. */
  skippedWithoutValue: readonly string[];
  /** Hedefler dolduğu için atanmadan bırakılan üniteler. */
  leftUnassigned: readonly string[];
  /** Kullanıcıya GÖRÜNEN gerekçeler; her şey dağıtıldıysa boş. */
  notices: readonly string[];
}

/** Yüzde eşitliğinde kayan nokta kalıntısını "eşit" saymak için pay. */
const DEFICIT_EPSILON = 1e-6;

/** Sözleşme oranı okunamazsa 50/50 varsayılır; karar `remaining` ile çözülür. */
const FALLBACK_OUR_RATIO = 0.5;

function parseValue(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function autoDistribute(input: AutoDistributeInput): AutoDistributeResult {
  const { rows, state, ourSharePct, ourExpectedCount, ownerExpectedCount } = input;

  const ratio = Number(ourSharePct) / 100;
  const ourRatio = Number.isFinite(ratio) ? ratio : FALLBACK_OUR_RATIO;

  let ourCount = 0;
  let ownerCount = 0;
  let ourValue = 0;
  let ownerValue = 0;
  const candidates: { unitId: string; value: number }[] = [];
  const skippedWithoutValue: string[] = [];

  for (const row of rows) {
    const side = effectiveAllocation(row, state).ownerSide;
    const value = parseValue(row.appraisal_value);

    if (side === "contractor") {
      ourCount += 1;
      ourValue += value ?? 0; // atanmış satırda değer yoksa toplama katkısı yok
      continue;
    }
    if (side === "landowner") {
      ownerCount += 1;
      ownerValue += value ?? 0;
      continue;
    }
    // Atanmamış: rayici olmayan dağıtıma GİRMEZ (0 sayılmaz).
    if (value === null) skippedWithoutValue.push(row.unit_id);
    else candidates.push({ unitId: row.unit_id, value });
  }

  // Değer dengesini oturtmak için büyük rayiçten küçüğe. Eşit değerde
  // `unit_id` sırası kullanılır: dağıtım DETERMİNİSTİK olmalıdır, aksi hâlde
  // aynı veriyle iki farklı sonuç çıkardı.
  const ordered = [...candidates].sort((a, b) =>
    b.value === a.value ? a.unitId.localeCompare(b.unitId) : b.value - a.value,
  );

  let remainingOur = Math.max(0, ourExpectedCount - ourCount);
  let remainingOwner = Math.max(0, ownerExpectedCount - ownerCount);

  const assignedToUs: string[] = [];
  const assignedToOwner: string[] = [];
  const leftUnassigned: string[] = [];
  const pending = new Map(state.pending);

  for (const candidate of ordered) {
    if (remainingOur === 0 && remainingOwner === 0) {
      leftUnassigned.push(candidate.unitId);
      continue;
    }

    let side: UnitOwnerSide;
    if (remainingOur === 0) side = "landowner";
    else if (remainingOwner === 0) side = "contractor";
    else {
      // Bu ünite eklendiğinde hangi taraf sözleşme oranının DAHA GERİSİNDE
      // kalıyorsa ünite ona gider.
      const totalAfter = ourValue + ownerValue + candidate.value;
      const ourDeficit = ourRatio * totalAfter - ourValue;
      const ownerDeficit = (1 - ourRatio) * totalAfter - ownerValue;
      if (Math.abs(ourDeficit - ownerDeficit) < DEFICIT_EPSILON) {
        side = remainingOur >= remainingOwner ? "contractor" : "landowner";
      } else {
        side = ourDeficit > ownerDeficit ? "contractor" : "landowner";
      }
    }

    // 🔴 GUARD 10 ile aynı kural: bu yol YALNIZ atanmamış üniteleri işler,
    // yani taşınacak bir hissedar yoktur ve `null` yazılır.
    pending.set(candidate.unitId, { ownerSide: side, shareholderId: null });

    if (side === "contractor") {
      assignedToUs.push(candidate.unitId);
      ourCount += 1;
      ourValue += candidate.value;
      remainingOur -= 1;
    } else {
      assignedToOwner.push(candidate.unitId);
      ownerCount += 1;
      ownerValue += candidate.value;
      remainingOwner -= 1;
    }
  }

  const notices: string[] = [];
  if (skippedWithoutValue.length > 0) notices.push(ALLOCATION_SKIPPED_WITHOUT_VALUE_MESSAGE);
  if (leftUnassigned.length > 0) notices.push(ALLOCATION_LEFT_UNASSIGNED_MESSAGE);

  return {
    state: { pending, selected: state.selected },
    assignedToUs,
    assignedToOwner,
    skippedWithoutValue,
    leftUnassigned,
    notices,
  };
}

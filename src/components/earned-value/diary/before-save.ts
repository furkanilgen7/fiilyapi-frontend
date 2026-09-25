/**
 * PLN-F2.3.1 · S1 — `onBeforeSave` yuvası: çekirdek KENDİ kaydından (taslak ya
 * da "Kaydet & Gönder") hemen önce bunu bekler. Mockup'ta tek düğme dağıtımı da
 * yazar (İ:121); ayrı "Dağıtımı kaydet" düğmesi yoktur.
 *
 * Kural: taslak kirli değilse (ya da kullanıcı düzenleyemiyorsa) istek atılmaz,
 * hemen çözülür. Kirliyse TAM küme PUT edilir; hata (409 kilitli gün / 422 /
 * ağ) YUTULMAZ — reddedilir, çekirdek kaydını yapmaz: yarım kayıt olmaz.
 */
import type { EvAllocationSave } from "@/lib/api/models";

export const INVALID_ALLOCATION_MESSAGE = "Saat dağıtımında geçersiz hücre var — düzeltip tekrar kaydedin.";

export interface BeforeSaveInput {
  canEdit: boolean;
  isDirty: boolean;
  invalidCount: number;
  buildBody: () => EvAllocationSave;
  save: (body: EvAllocationSave) => Promise<unknown>;
}

export async function saveAllocationIfDirty(input: BeforeSaveInput): Promise<void> {
  if (!input.canEdit || !input.isDirty) return;
  if (input.invalidCount > 0) throw new Error(INVALID_ALLOCATION_MESSAGE);
  await input.save(input.buildBody());
}

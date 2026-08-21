import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  downloadUnitsImportTemplate,
  importUnits,
  validateUnitsImport,
  type UnitImportResult,
  type UnitImportUploadInput,
  type UnitImportValidation,
} from "@/lib/api/units-import-client";

import { invalidateUnitDerived } from "./useUnitMutations";

/**
 * F-UNIT2 T2b · EI ("Excel'den Ünite İçe Aktarma") ekranının uç yüzeyi — ÜÇ uç.
 *
 * 🔴 ÜÇÜ DE `openapi-fetch` İLE GEÇİLEMEZ: ikisi `multipart/form-data`
 * (boundary'yi tarayıcı üretmeli), biri ikili `.xlsx` indirmesi. Bu yüzden
 * gövde `units-import-client.ts`tedir ve buradaki hook'lar YALNIZ React Query
 * sarmalıdır (`useDocumentMutations.ts::useUploadDocument` emsali).
 *
 * ⚠️ BFF İZİN LİSTESİ: üç uç da `projects` segmentiyle başlar ve o kök
 * `ALLOWED_ROOTS`ta ZATEN vardır. Yeni kök EKLENMEZ (F-MT2 kanonu).
 */
export type { UnitImportResult, UnitImportUploadInput, UnitImportValidation };

/** Üç ucun da proje kimliği YOL parametresidir, gövdede DEĞİL. */
export interface UnitImportVariables {
  projectId: string;
  input: UnitImportUploadInput;
}

/**
 * EI 201 "Yeniden Doğrula" — `POST …/units/import/validate`.
 *
 * 🔴 **HİÇBİR ÖNBELLEĞİ GEÇERSİZ KILMAZ.** Uç sunucuda tek bir satır bile
 * oynatmaz (*"HICBIR SEY YAZMAZ"*, denetim satırı da yazmaz), dolayısıyla blok
 * listesi / ünite ızgarası / satış özeti BAYATLAMAZ. `invalidateUnitDerived`
 * çağırmak üç sorguyu bedava yeniden çektirir ve "doğrulama yazan bir uçtur"
 * yanılgısını koda yazardı (`useBulkUnitPreview` ile AYNI gerekçe).
 *
 * `useMutation` (query değil) seçildi: uç POST'tur, gövdesi bir dosyadır ve
 * yalnız kullanıcı dosya seçince / düğmeye basınca çalışır.
 */
export function useValidateUnitsImport(): UseMutationResult<
  UnitImportValidation,
  Error,
  UnitImportVariables
> {
  return useMutation({
    mutationFn: ({ projectId, input }) => validateUnitsImport(projectId, input),
  });
}

/**
 * EI 38/202 "N Geçerli Satırı Aktar" — `POST …/units/import`.
 *
 * 🔴 KISMİ AKTARIM SUNUCUNUN BİLİNÇLİ DAVRANIŞIDIR: geçerli satırlar yazılır,
 * hatalılar raporlanır; HİÇ geçerli satır yoksa **422** döner (*"`created=0`
 * ile 200 donmek kullanicinin 'aktarildi' sanmasina yol acardi"*). Hata
 * çağırana AYNEN iletilir — ekran onu yutmaz.
 *
 * Başarıda üç türev geçersiz kılınır: uç hem ÜNİTE hem BLOK yazar
 * (`blocks_created`), yani blok kartlarındaki sayılar, ünite ızgarası ve satış
 * KPI özeti bayattır. `useCreateBulkUnits` ile aynı küme; kopyalanmaz,
 * `invalidateUnitDerived` paylaşılır.
 */
export function useImportUnits(): UseMutationResult<
  UnitImportResult,
  Error,
  UnitImportVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }) => importUnits(projectId, input),
    onSuccess: () => invalidateUnitDerived(queryClient),
  });
}

/**
 * EI 37/87 "Şablon İndir" — `GET …/units/import/template`.
 *
 * Yanıt tarayıcıya bir dosya indirtir, bileşene bir değer DÖNMEZ (`void`).
 * Önbellek de dokunulmaz: şablon proje verisi taşımaz ve hiçbir sorgunun
 * kaynağı değildir.
 */
export function useDownloadUnitsImportTemplate(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: (projectId: string) => downloadUnitsImportTemplate(projectId),
  });
}

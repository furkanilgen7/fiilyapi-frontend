import { BackendError } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/api/error-message";

/**
 * F-ST · Stok yazma uçlarının hata metni — ST backend spec **§4b kanonu**:
 *
 * > Gövde içi VARLIK referansı = **404** · biçim/kural ihlali = **422**.
 *
 * Yani `warehouse_id` / `source_warehouse_id` / `item_id` /
 * `received_by_user_id` / `site_id` gibi bir KİMLİK bulunamadığında 404 gelir
 * (görünmeyen ile var olmayan AYNI gövdeyi alır — kimlik varlığı sızmaz);
 * miktar işareti/sıfır, transferde kaynak eksikliği, kendine transfer,
 * `purchase`/`adjustment`ta kaynak verilmesi ve `limit` tavanı 422'dir.
 *
 * Her iki durum da kullanıcıya **Türkçe ve GÖRÜNÜR** basılır — sessiz yutma
 * yok. Backend `detail` alanında zaten Türkçe cümle döndürür; bu yüzden asıl
 * kaynak odur (`backendErrorMessage`) ve buradaki metinler yalnızca gövde
 * okunamadığında devreye giren YEDEKLERDİR.
 */
export function stockErrorMessage(err: unknown): string {
  if (err instanceof BackendError) {
    if (err.status === 404) {
      return backendErrorMessage(
        err,
        "Seçilen kayıt bulunamadı — liste yenilenmiş olabilir, sayfayı tazeleyip tekrar deneyin.",
      );
    }
    if (err.status === 422) {
      return backendErrorMessage(err, "Girilen bilgiler kurallara uymuyor — alanları kontrol edin.");
    }
    if (err.status === 403) {
      return backendErrorMessage(err, "Bu işlem için yetkiniz yok.");
    }
  }
  return backendErrorMessage(err, "Beklenmeyen bir hata oluştu.");
}

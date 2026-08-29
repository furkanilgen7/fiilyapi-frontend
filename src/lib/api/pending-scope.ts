/**
 * URL-3 · "VERİLDİ AMA HENÜZ ÇÖZÜLMEDİ" KAPISI.
 *
 * KÖK OLAY (ölçüldü): URL artık slug taşıyor, ama liste/süzgeç uçlarının
 * neredeyse tamamı UUID bekliyor. Ekran bu yüzden önce slug'ı kanonik kimliğe
 * çözer (`GET /projects|sites|sections/{key}` → `.id`) ve o kimliği alt
 * sorgulara verir. Çözülene kadar geçen BİR RENDER boyunca elde boş string
 * vardır.
 *
 * 🔴 O BİR RENDER MASUM DEĞİLDİR. Bu depodaki süzgeç kurucuları boş değeri
 * DOĞRULUK TESTİYLE atar:
 *
 *     ...(filter.project_id ? { project_id: filter.project_id } : {})
 *
 * Yani boş kimlik "süzgeç yok" demeye dönüşür ve uç SÜZGEÇSİZ çağrılır:
 * `GET /progress-payments` TÜM projelerin hakedişlerini döndürür. Ekran o
 * yanıtı tek projenin verisi sanıp TOPLAR — kullanıcı bir an başka projelerin
 * parasını kendi projesinin toplamında görür. Sessiz, 422 vermeyen, yalnız
 * gözle yakalanabilen bir kusur sınıfıdır.
 *
 * ⚠️ `undefined` İLE `""` AYNI ŞEY DEĞİLDİR ve bu ayrım bu modülün TAMAMIDIR:
 *   · `undefined` = çağıran BİLEREK süzgeçsiz istiyor (`/hakedisler` liste
 *     ekranı) → ağa çıkılır.
 *   · `""`        = çağıran bir kimlik BEKLİYOR ama henüz çözülmedi → BEKLE.
 * İkisini eşitleyen bir uygulama (`!filter.project_id`) liste ekranını
 * sonsuza kadar boş bırakırdı.
 */
export function isScopePending(...keys: readonly (string | undefined)[]): boolean {
  return keys.some((key) => key !== undefined && key.length === 0);
}

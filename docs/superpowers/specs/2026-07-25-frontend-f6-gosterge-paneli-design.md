# F6 — Gösterge Paneli ekranı (tasarım)

Tarih: 2026-07-25
Kapsam: Alt-Proje 1 (Temel), son frontend fazı
Mockup kanonu: `projedesign/Ekran 1 - Gösterge Paneli.dc.html`
Yardımcı kanon: `projedesign/Ekran 4 - Projeler.dc.html` (yalnızca "Tamamlandı" rozeti)
Bağımlı: B6 (`GET /dashboard/summary`)

---

## 1. Amaç

`/` rotasındaki geçici karşılama sayfasını gerçek gösterge paneliyle değiştirmek.
Düzen, ölçüler ve renkler mockup'ın satır içi stillerinden okunur; göz kararı yok.

Ana spec §7: **kabuk gerçek, veri dürüst.** Beş kart v1'de boş durum gösterir; kart
iskeleti, başlığı ve kutu ölçüleri mockup'la birebir kalır.

## 2. Rota ve dosyalar

Gösterge paneli `(app)` grubunun index rotasıdır — yeni klasör açılmaz.

```
src/app/(app)/page.tsx                     # değiştirilir (geçici karşılama silinir)
src/app/(app)/home.css                     # silinir
src/components/dashboard/
├── DashboardView.tsx                      # düzen: breadcrumb, başlık, 3 satır
├── PortfolioCard.tsx                      # 1. satır sol, geniş kart + grafik alanı
├── KpiCard.tsx                            # 1. satır sağ iki kart (280px)
├── ProjectCard.tsx                        # proje kartı
├── ProjectGrid.tsx                        # 4 sütun + sıfır-proje boş durumu
├── PendingApprovalsCard.tsx               # alt satır sol
├── RisksCard.tsx                          # alt satır sağ
├── CardEmptyState.tsx                     # ortak boş durum bloğu
└── dashboard.css
src/lib/format.ts                          # tr-TR sayı/para/yüzde biçimleyicileri
```

`page.tsx` veriyi çeken istemci bileşenini (`DashboardView`) sarar; istek F2'de kurulan
`/api/backend/[...path]` BFF proxy'si üzerinden gider (httpOnly çerezli oturum).

## 3. Ölçüler

Tümü mockup'ın satır içi stillerinden okundu. Renkler `tokens.css` üzerinden;
çıplak hex yazılmaz.

### 3.1 Sayfa

| Öğe | Değer |
|---|---|
| İçerik alanı | `padding: 28px 32px`, `animation: fadeUp .4s ease` |
| Breadcrumb | 12px, `--color-text-subtle`, `gap: 6px`, `margin-bottom: 6px` |
| Başlık `h1` | 26px/700, `letter-spacing: -0.5px`, `margin-bottom: 24px` |

Breadcrumb metni: `{role_name} Görünümü · {active_project_count} Aktif Proje`.

### 3.2 Kart temeli

`radius: 14px` · `border: 1px solid var(--color-border)` · yüzey `--color-surface` ·
gölge `--shadow-card` (`0 1px 4px rgba(0,0,0,0.06)`).

Mockup bu ekranda `.07` yazıyor; ana spec §6.1 bunu kopyala-yapıştır kalıntısı sayıp
`.06`'da sabitledi. Token kullanılır.

### 3.3 Üst satır

`display: grid` · `grid-template-columns: 1fr 280px 280px` · `gap: 16px` ·
`margin-bottom: 16px`.

| Öğe | Değer |
|---|---|
| Kart dolgusu | 24px |
| Kart etiketi | 11px/600, uppercase, `letter-spacing: 1px`, `--color-text-subtle`, `margin-bottom: 16px` |
| Portföy tutarı | `₺` 13px Mono + 42px/700 Mono, `letter-spacing: -2px` |
| KPI tutarı | 32px/700 Mono, `letter-spacing: -1px`, `margin-bottom: 8px` |
| KPI alt satırı | 12px/500 |
| İlerleme çubuğu | yükseklik 4px, `radius: 2px` |
| Grafik alanı | `viewBox="0 0 500 80"`, yükseklik 80px, tam genişlik |

### 3.4 Proje ızgarası

`grid-template-columns: repeat(4, 1fr)` · `gap: 16px` · `margin-bottom: 16px`.

Sütun sayısı **sabittir**. 3 proje → son hücre boş; 7 proje → ikinci satıra akar.
Proje yoksa ızgara yerine tam genişlikte tek boş-durum kartı basılır
("Henüz proje tanımlanmadı").

Kart içi (dolgu 18px):

| Sıra | Öğe | Değer |
|---|---|---|
| 1 | Durum noktası + etiket | nokta 6px daire, etiket 11px `--color-text-subtle`, `gap: 6px`, `margin-bottom: 4px` |
| 2 | Proje adı | 14px/600, `margin-bottom: 12px` |
| 3 | Tutar | 22px/700 Mono, `margin-bottom: 2px` |
| 4 | **`Bütçe` etiketi** | 11px `--color-text-subtle`, `margin-bottom: 10px` |
| 5 | İlerleme çubuğu | yükseklik 3px, `radius: 2px`, zemin `--color-divider` |
| 6 | İlerleme metni | 11px `--color-text-subtle`, `margin-top: 6px`, `"%{progress} tamamlandı"` |

4. sıradaki `Bütçe` etiketi mockup'ta **yoktur**; §6'da gerekçelendirilmiştir. Mockup'ta
tutarın `margin-bottom` değeri 10px'tir; etiket araya girdiği için 2px + 10px olarak
bölünür, toplam ritim korunur.

Durum renkleri:

| `status` | Nokta | Çubuk dolgusu | Etiket |
|---|---|---|---|
| `active` | `#22c55e` | `#2563eb` | Aktif |
| `on_hold` | `#f59e0b` | `#f59e0b` | Beklemede |
| `completed` | `#64748b` | `#64748b` | Tamamlandı |

`completed` bu ekranın mockup'ında yer almıyor; renk ve etiket
`Ekran 4 - Projeler.dc.html` satır 273'teki tamamlanmış proje rozetinden alındı
(zemin `#f1f5f9`, metin `#64748b`). Uydurulmuş değer yoktur.

### 3.5 Alt satır

`grid-template-columns: 1fr 1fr` · `gap: 16px` · kart dolgusu 20px ·
başlık 13px/600 `margin-bottom: 16px`.

| Öğe | Değer |
|---|---|
| Onay sayacı rozeti | `--color-danger` zemin, beyaz 10px/700, `padding: 2px 7px`, `radius: 10px` |
| Onay satırı | `padding: 10px 12px`, `--color-surface-2` zemin, `radius: 8px`, `border: 1px solid var(--color-border)` |
| Risk satırı | `padding: 12px`, `radius: 8px`, sol kenar **4px** |

Risk şeridinin sol kenarı mockup'ta 3px; ana spec §6.1 bunu 4px'te sabitledi.

Onay sayacı rozeti yalnızca `pending_approvals.count > 0` iken basılır. v1'de sayaç
daima 0 olduğu için rozet görünmez — sahte "7" yazılmaz.

## 4. Boş durumlar

Beş kart da (portföy, tahsil edilecek, ortalama marj, onay bekleyenler, risk) aynı
`CardEmptyState` bloğunu kullanır: iki satır metin, kart ölçüleri ve başlığı korunur.

```
Henüz hakediş verisi yok
Hakediş modülüyle birlikte gelir
```

İkinci satır `pending_module` anahtarından türetilir. Eşleme frontend'de tek yerde
tutulur:

| `pending_module` | İkinci satır |
|---|---|
| `progress_payments` | Hakediş modülüyle birlikte gelir |
| `invoicing` | Fatura yönetimiyle birlikte gelir |
| `approvals` | Onay kutusuyla birlikte gelir |
| `inventory` | Stok ve saha modülleriyle birlikte gelir |

İlk satır karta özeldir (portföy → "Henüz hakediş verisi yok", tahsil edilecek →
"Henüz fatura verisi yok", ortalama marj → "Henüz marj hesabı yok", onay bekleyenler →
"Onay bekleyen kayıt yok", risk → "Uyarı yok").

Boş kartlarda ilerleme çubukları %0 genişlikle, portföy grafiği ise boş çizim
alanıyla basılır — iskelet görünür kalır, sahte eğri çizilmez.

Dallanma daima `available` alanına bakar, sabite değil. Alt-proje geldiğinde
`available: true` dönmeye başlar ve bu dosyalarda değişiklik gerekmez.

## 5. Sayı biçimi

`src/lib/format.ts`, tümü `tr-TR`:

| Fonksiyon | Girdi → Çıktı |
|---|---|
| `formatCompactCurrency` | `1500000` → `₺ 1,5M` |
| `formatCurrency` | `24870500` → `₺ 24.870.500` |
| `formatPercent` | `42.5` → `%42,5` · `75` → `%75` |

Kart tutarları kısa, portföy tutarı tam gruplu (mockup'taki iki ayrı gösterimin
karşılığı). Yüzdede sondaki sıfır atılır.

## 6. Mockup'a bilinçli eklemeler

Üçü de onaylandı; sessizce yapılmış sapma yoktur.

1. **Proje kartında `Bütçe` etiketi.** Mockup'taki büyük tutar hakediş toplamıdır ve v1'de
   veri kaynağı yoktur (Alt-Proje 3). Elde yalnızca `budget` var. Etiketsiz basmak, ana
   spec §7'nin "hangi sayının gerçek olduğu belirsizleşmesin" kuralını çiğnerdi.
   Alt-Proje 3 geldiğinde kart hakedişe döner.
2. **`Tamamlandı` durumu.** Bu mockup'ta yok; Ekran 4'ten alındı (§3.4).
3. **Sıfır proje boş durumu.** Mockup'ta tanımsız; ızgara yerine tam genişlik kart.

## 7. Sidebar güncellemesi

Mockup'ın sol menüsü yenilendi: *Sözleşme & Mali* grubuna, Bordro ile Belge Arşivi
arasına **Şirket Varlıkları** eklendi. `nav-config.ts` buna göre güncellenir;
`/sirket-varliklari` mevcut `[...slug]` catch-all'ı üzerinden ComingSoon ekranına düşer —
yazılmamış diğer nav kalemleriyle aynı muamele. Sahte kontrol eklenmez.

Sidebar'ın geri kalanı ve topbar birebir aynıdır; F3'te yazılan kabuk değişmez.

## 8. Testler

| Katman | Kapsam |
|---|---|
| Birim | `ProjectCard` üç durum rozeti · `ProjectGrid` 0/3/7 proje · `CardEmptyState` dört `pending_module` eşlemesi · `KpiCard` dolu ve boş dal · `format.ts` sınır değerleri |
| Görsel regresyon | `/` @ 1440px, oturumlu. Baseline'lar **yalnızca** `visual-baselines.yml` (workflow_dispatch) → `linux-baselines` artifact → `e2e/` altına kopyalanır. macOS'ta PNG üretilmez. |
| E2E | Giriş → `/` → başlık, breadcrumb ve en az bir proje kartı görünür; sidebar'da Şirket Varlıkları kalemi var ve tıklanınca ComingSoon açılıyor |

Ana spec §9 madde 2 gereği responsive hedef yok; tek kırılım 1440px.

## 9. Kapsam dışı (onaylı istisnalar)

Yazılmamış modüllere bağlı mockup öğeleri, ilgili modülüyle gelir; sahte kontrol konmaz:

- Topbar proje seçici (`Güneşkent Konut · A-Blok` açılırı)
- Topbar "4 proje aktif" açılırı
- Sidebar Onay Kutusu `7` rozeti
- FİİL AI kartı ve durum noktası

`Ekran 4 - Projeler` mockup'ının getirdiği proje tipi taksonomisi (Taahhüt / Kendi Yatırım
/ Kat Karşılığı) bu ekranın kartlarında **görünmez** — mockup tip rozeti göstermiyor.
Taksonomi Alt-Proje 2'nin kapsamındadır.

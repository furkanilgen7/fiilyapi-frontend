import Link from "next/link";

import { SubcontractorPaymentRow } from "@/components/progress-payments/SiteSubcontractorPaymentsPanel";
import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { listTruncationMessage, type ListTruncation } from "@/lib/list-truncation";
import { pendingModuleLabel } from "@/lib/pending-modules";
import "@/components/progress-payments/progress-payments.css";

import { partitionSectionPayments } from "./section-payments";

/**
 * F-BLMSEK T2 · Bölüm Detay › "Hakediş" sekmesinin GÖVDESİ.
 *
 * 🔴 MOCKUP BU SEKME İÇİN PANEL ÇİZMEZ (`Bölüm Detay.dc.html` 102-104 yalnız
 * sekme DÜĞMELERİ). F-BLMPUAN/T1'in kanonik cevabı uygulanır: yeni bir görsel
 * dil İCAT EDİLMEZ, şantiye "Hakedişler" ekranının satırı
 * (`SubcontractorPaymentRow`) OLDUĞU GİBİ yeniden kullanılır. Satır markup'ı
 * TEK tanımdan gelir; paralel bir liste zamanla ayrışırdı.
 *
 * 🔴 KAPSAM İDDİASI (bu panelin KALBİ): sekmenin adı "Hakediş"tir ama burada
 * yalnız TAŞERON hakedişleri listelenir. İŞVEREN hakedişi bölüme HİÇ
 * kırılamaz — ölçüldü: `backend/app/modules/progress_payments/` altında
 * `section_id` SIFIR isabet. Bunu söylemeyen bir liste "bölümün hakedişleri"
 * gibi görünüp yarısını gösterirdi; yerini aldığı yer tutucudan DAHA KÖTÜ
 * olurdu. Bu yüzden kapsam satırı HER dalda, GÖRÜNÜR basılır — `title=` ya da
 * `sr-only` içinde SAKLANMAZ.
 *
 * 🔴 KIRPILMA DÜRÜSTLÜĞÜ: süzgeç İSTEMCİDE çalışır. Sunucu listeyi tavanda
 * (`SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT = 200`) kırptıysa bu bölümün
 * hakedişleri tamamen dışarıda kalmış olabilir ve panel kendinden emin
 * "Bu bölümde taşeron hakedişi yok" basardı. Bant o güveni kırar.
 */
export interface SectionPaymentsPanelProps {
  sectionId: string;
  /** Başlıkta VE bu bölüme ait satırların alt metninde basılır. */
  sectionName: string;
  /** `useSiteSubcontractorPayments.items` — sözleşmesi BU şantiyeye bağlı
   * satırlar; süzgeç (bölüm ekseni) burada uygulanır. */
  items: readonly SiteSubcontractorPaymentItem[];
  /**
   * HAK-NULL · sözleşmesi PROJE GENELİ olan satırlar.
   *
   * 🔴 NEDEN BU PANELE DE GİRİYOR: proje geneli bir sözleşme projenin tüm
   * şantiyelerini — dolayısıyla bu şantiyenin BU bölümünü de — kapsar.
   * Dışarıda bırakmak, eskiden sunucunun yaptığı hatanın istemcide
   * tekrarlanması olurdu (canlıda sözleşmelerin HEPSİ proje geneliydi ve bu
   * panel "bu bölümde taşeron hakedişi yok" diyordu).
   *
   * Bölüm ekseni ayrıca süzülür: `partitionSectionPayments` bu satırların
   * `sectionId`ine bakar, BAŞKA bölüme atanmışlarsa yine düşer. İki eksen
   * bağımsızdır.
   */
  projectWideItems?: readonly SiteSubcontractorPaymentItem[];
  isLoading: boolean;
  isError: boolean;
  /** Sunucu tavanı aşıldı — liste EKSİK, "yok" iddiası güvenilmez. */
  isPartial: boolean;
  truncation: ListTruncation;
  /** Şantiye "Hakedişler" ekranı — dışarıda kalanların GÖRÜLEBİLDİĞİ yer. */
  paymentsHref: string;
}

export function SectionPaymentsPanel({
  sectionId,
  sectionName,
  items,
  projectWideItems = [],
  isLoading,
  isError,
  isPartial,
  truncation,
  paymentsHref,
}: SectionPaymentsPanelProps) {
  // İKİ EKSEN, İKİ SÜZGEÇ: kapsam (şantiye/proje geneli) ekseni hook'ta
  // ayrıldı; burada BÖLÜM ekseni süzülür. Proje geneli satırlar da bölüm
  // süzgecinden geçer — başka bir bölüme atanmış olan yine düşer.
  const partition = partitionSectionPayments([...items, ...projectWideItems], sectionId);
  const excluded = partition.otherSectionCount;

  return (
    <section className="section-pp" data-testid="section-payments" aria-labelledby="section-pp-title">
      <div className="section-pp__head">
        <h2 className="section-pp__title" id="section-pp-title">
          {sectionName} · Taşeron Hakedişleri
        </h2>
        <Link className="section-pp__link" href={paymentsHref}>
          Şantiye hakedişleri →
        </Link>
      </div>

      {/* 🔴 HER DALDA basılır — yükleme/hata/boş/dolu. Yalnız boş dala
          konsaydı dolu listede kullanıcı eksikliği HİÇ öğrenemezdi. */}
      <p className="section-pp__scope" data-testid="section-payments-scope">
        Yalnız taşeron hakedişleri listelenir —{" "}
        {pendingModuleLabel("section_employer_progress_payments")}
      </p>

      {isPartial && (
        <p className="section-pp__band" data-testid="section-payments-band">
          {listTruncationMessage(truncation)} Bu bölümün hakedişleri listenin dışında kalmış olabilir.
        </p>
      )}

      {isError ? (
        <p className="section-detail__message">Taşeron hakedişleri yüklenemedi</p>
      ) : isLoading ? (
        <p className="section-detail__message">Yükleniyor…</p>
      ) : partition.entries.length === 0 ? (
        // 🔴 "Veri YOK" ≠ "modül bu bölüme KIRILMIYOR". Taşeron bağı AÇIK
        // (`section_id` liste şemasında VAR); eksik olan KAYITTIR. Bu yüzden
        // `CardEmptyState` + `pendingModule` burada YANLIŞ bilgi olurdu.
        <div className="section-pp__empty" data-testid="section-payments-empty">
          <p className="section-pp__empty-title">Bu bölümde taşeron hakedişi yok</p>
          <p className="section-pp__empty-hint">
            Bu bölüme bağlanmış taşeron hakedişi bulunmuyor
          </p>
        </div>
      ) : (
        <ul className="section-pp__list pp-list">
          {partition.entries.map((entry) => (
            <SubcontractorPaymentRow
              key={entry.item.id}
              item={entry.item}
              // Bölüm kapsamlı satırda adı BİLİYORUZ — pending "—" basmak
              // elde olan gerçeği saklamak olurdu. `null` kapsamlı satırda ad
              // GEÇİLMEZ, satır "Tüm Bölümler" basar.
              //
              // 🔴 MUTASYON DENETİMİ NOTU: bu koşulu `sectionName`e sabitleyen
              // mutant HAYATTA KALDI — ama EŞDEĞERDİR, eksik bekçi DEĞİL:
              // kural `buildSubcontractorRowSubtitle` içinde de yaşar
              // (`sectionId !== null &&` kapısı) ve o kapıyı silen mutant
              // ÖLDÜ. Yani "null satır bölüm adıyla EZİLMEZ" özelliği İKİ
              // katmanda birden korunuyor; buradaki koşul o savunmanın
              // ikincisidir ve BİLEREK bırakılmıştır.
              resolvedSectionName={entry.isSectionScoped ? sectionName : undefined}
            />
          ))}
        </ul>
      )}

      {/* 🔴 SESSİZ ATLAMA = İHLAL (F-TH kanonu). */}
      {excluded > 0 && (
        <p className="section-pp__note" data-testid="section-payments-note">
          başka bölüme atanmış {excluded} hakediş bu listede yok —{" "}
          <Link className="section-pp__note-link" href={paymentsHref}>
            şantiye hakedişlerinde
          </Link>{" "}
          görünür
        </p>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { BoqTotalsStrip } from "@/components/boq/BoqTotalsStrip";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui/button/Button";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/boq/boq.css";

// Ekran 13 · İş Kalemleri (BOQ) — spec §2.1. Rota `[projectId]/layout.tsx`
// altindadir, DrillSidebar oradan gelir; bu sayfa KENDI LAYOUT'UNU KURMAZ
// (kabugun sahibi tek seviyedir).
export default function BoqPage() {
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();
  // Santiye sorgusu breadcrumb icindir; drill kabugu ayni anahtari zaten
  // cektiginden ikinci bir ag istegi olusmaz (React Query onbellegi).
  const siteQuery = useSite(siteId);
  const boqQuery = useBoq(siteId);

  if (isForbidden(boqQuery.error) || isForbidden(siteQuery.error)) return <AccessDenied />;

  const site = siteQuery.data;
  // Durum dallari (spec §9): 403 yukarida yakalandi; kalan iki dal burada.
  // Baslik seridi her durumda basilir, yalniz govde degisir.
  const message = boqQuery.isError
    ? "İş kalemleri yüklenemedi"
    : boqQuery.isLoading || !boqQuery.data
      ? "Yükleniyor…"
      : null;

  return (
    <div className="boq">
      {/* Breadcrumb (mockup 62) — onayli sapma C: sozlesme numarasi basilmaz.
          Santiye adi bilinmeden hic basilmaz; uydurma etiket yazilmaz. */}
      {site && (
        <p className="boq__crumb">
          <Link className="boq__crumb-link" href={`/projeler/${projectId}/santiyeler/${siteId}`}>
            ← {site.name}
          </Link>
          {` · ${site.project.name} / ${site.name}`}
        </p>
      )}

      <div className="boq__title-bar">
        <h1 className="boq__title">İş Kalemleri (BOQ)</h1>
        {/* Iki buton da bu task'ta islevsizdir; davranis F8/F9'da baglanir. */}
        <div className="boq__actions">
          <Button variant="secondary" className="boq-action">
            Excel İndir
          </Button>
          <Button variant="primary" className="boq-action boq-action--primary">
            + İş Kalemi
          </Button>
        </div>
      </div>

      {/* Kart seridi yukleme/hata/bos durumlarinda da basilir (spec §9 sonu);
          dordu de yer tutucudur (spec §4). */}
      <BoqTotalsStrip totals={boqQuery.data?.totals} />

      {message !== null && <p className="boq__message">{message}</p>}
    </div>
  );
}

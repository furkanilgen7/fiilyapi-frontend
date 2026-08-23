import Link from "next/link";

import type { components } from "@/lib/api/schema";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type Placeholder = components["schemas"]["PendingApprovalsPlaceholder"];

export function PendingApprovalsCard({ data }: { data: Placeholder }) {
  // items semada opsiyonel (backend bos listede alani atlayabilir).
  const items = data.items ?? [];

  // 🔴 `data.available`e DALLANILMAZ. Rozet count'a, govde ise `available`a
  // bagliydi; backend gercek count'u DOLU, `items`i BILEREK BOS dondurdugu
  // icin kart ayni anda hem "3" hem "Onay bekleyen kayit yok" basiyordu.
  // Ustelik `available: false` + count>0 gelirse ayni yalan geri gelir.
  // Tek olcut: `data.count` ve `items.length`.
  let body;
  if (items.length > 0) {
    // Mockup satir 308-313: dolu liste.
    body = (
      <ul className="dash-list">
        {items.map((item) => (
          <li key={item} className="dash-list__row">
            {item}
          </li>
        ))}
      </ul>
    );
  } else if (data.count > 0) {
    // Sayac var ama satirlar gelmiyor: kullaniciyi kaydin durdugu yere
    // (`/onay-kutusu`) gonderen tek satir. Kutu mockup satir 308-313'un
    // ayni kutusudur (`.dash-list__row`).
    body = (
      <div className="dash-list">
        <Link className="dash-list__row dash-list__row--link" href="/onay-kutusu">
          <span className="dash-list__row-title">Onay Kutusu</span>
          <span className="dash-list__row-meta">{data.count} bekleyen</span>
        </Link>
      </div>
    );
  } else {
    // count == 0: gercekten bos. `pending_module` gerekcesi BASILMAZ — modul
    // canli (`/onay-kutusu`), gerekce bayat olurdu.
    body = <CardEmptyState title="Onay bekleyen kayıt yok" />;
  }

  return (
    <section className="dash-card dash-list-card">
      <h2 className="dash-list-card__title">
        Onay Bekleyenler
        {data.count > 0 && (
          <span className="dash-list-card__badge" data-testid="dash-approvals-badge">
            {data.count}
          </span>
        )}
      </h2>
      {body}
    </section>
  );
}

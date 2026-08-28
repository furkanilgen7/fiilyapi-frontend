import { pendingModuleLabel, type PendingModuleKey } from "@/lib/pending-modules";

import "./dashboard.css";

export function CardEmptyState({
  title,
  pendingModule,
}: {
  title: string;
  // Opsiyonel: gerekce satiri YALNIZ anahtar DOLU oldugunda basilir. IKI hâl
  // bilerek atlanir ve ayri sebeplerle sessiz kalir:
  //   1. `undefined` — anahtarin bayat kaldigi yuzeylerde (or. onay karti)
  //      cagiran taraf gerekceyi bilerek gecmez.
  //   2. `null` — K-ZARF UCUNCU HALI: backend'in `restricted()` fabrikasi
  //      (`available:false` + `pending_module:null`) "ROLUN IZNI YOK" der.
  //      Modul VARDIR; `pendingModuleLabel(null)` bu hâlde "İlgili modülle
  //      birlikte gelir" dondurur ve bu cumle O HÂLDE YALANDIR.
  pendingModule?: PendingModuleKey;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      {/* 🔴 KASITLI GEVSEK ESITLIK: `!= null` hem `null` hem `undefined`
          yakalar — yukaridaki iki hâl de tek dalda susar. `!== undefined`
          YETMEZ, `null`i gecirir ve ekran sahte gerekce basar. */}
      {pendingModule != null && (
        <p className="dash-empty__hint">{pendingModuleLabel(pendingModule)}</p>
      )}
    </div>
  );
}

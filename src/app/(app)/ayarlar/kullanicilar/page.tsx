import { Suspense } from "react";
import { UsersScreen } from "@/components/settings/UsersScreen";

export default function KullanicilarPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <UsersScreen />
    </Suspense>
  );
}

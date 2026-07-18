const FEATURES: ReadonlyArray<{ icon: string; text: string }> = [
  { icon: "📍", text: "Proje → Şantiye → Bölüm hiyerarşisi" },
  { icon: "📊", text: "Günlük kayıttan otomatik hakediş" },
  { icon: "💰", text: "Gerçek zamanlı mali tablolar & muhasebe" },
  { icon: "👷", text: "Puantaj, bordro ve İK yönetimi" },
];

// Giris ekraninin sol marka paneli — statik, etkilesimsiz.
export default function BrandPanel() {
  return (
    <aside className="login-brand">
      <div className="login-brand__logo">
        <div className="login-brand__logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="login-brand__logo-svg">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".3" />
          </svg>
        </div>
        <div>
          <div className="login-brand__name">FİİL</div>
          <div className="login-brand__sub">YAPI ERP</div>
        </div>
      </div>

      <div>
        <div className="login-brand__headline">
          İnşaat projelerinizi
          <br />
          tek platformda yönetin
        </div>
        <div className="login-brand__desc">
          Şantiyeden muhasebeye, taşeron hakedişinden işveren faturasına kadar her şey entegre.
        </div>
        <div className="login-brand__features">
          {FEATURES.map((f) => (
            <div key={f.text} className="login-brand__feature">
              <span className="login-brand__feature-icon" aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="login-brand__copyright">© 2026 FİİL Yazılım A.Ş. · Tüm hakları saklıdır.</div>
    </aside>
  );
}

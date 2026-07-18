const DEMO_ACCOUNTS: ReadonlyArray<{ icon: string; label: string; email: string; tag: string }> = [
  { icon: "👔", label: "Patron Görünümü", email: "patron@fiil.com", tag: "Tüm Erişim" },
  { icon: "👷", label: "Şantiye Şefi", email: "sef@fiil.com", tag: "Saha Erişim" },
  { icon: "📒", label: "Muhasebe", email: "muhasebe@fiil.com", tag: "Mali Erişim" },
];

type Props = {
  onPick: (email: string) => void;
};

// Yalniz gelistirme ortaminda render edilir (LoginForm karar verir).
export default function DemoAccounts({ onPick }: Props) {
  return (
    <div className="login-demo">
      <div className="login-demo__title">Demo Hesapları</div>
      <div className="login-demo__list">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            className="login-demo__item"
            onClick={() => onPick(a.email)}
          >
            <span aria-hidden="true">{a.icon}</span>
            <span className="login-demo__label">{a.label}</span>
            <span className="login-demo__email">{a.email}</span>
            <span className="login-demo__tag">{a.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import "./dashboard.css";

// Backend pending_module anahtari doner; kullaniciya gosterilen metin frontend'in isi.
const MODULE_LABELS: Record<string, string> = {
  progress_payments: "Hakediş modülüyle birlikte gelir",
  invoicing: "Fatura yönetimiyle birlikte gelir",
  approvals: "Onay kutusuyla birlikte gelir",
  inventory: "Stok ve saha modülleriyle birlikte gelir",
};

const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

export function CardEmptyState({
  title,
  pendingModule,
}: {
  title: string;
  pendingModule: string;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      <p className="dash-empty__hint">{MODULE_LABELS[pendingModule] ?? FALLBACK_LABEL}</p>
    </div>
  );
}

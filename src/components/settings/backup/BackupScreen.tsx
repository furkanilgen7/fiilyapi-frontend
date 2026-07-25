import { Select } from "@/components/ui";
import { Toggle } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import "./backup-screen.css";

type HistoryRow = {
  date: string;
  type: string;
  size: string;
};

// Sabit ornek veri; backend baglantisi yok (informational-only).
const HISTORY: HistoryRow[] = [
  { date: "17.07.2026 02:00", type: "Otomatik · Günlük", size: "2,4 GB" },
  { date: "16.07.2026 02:00", type: "Otomatik · Günlük", size: "2,3 GB" },
  { date: "13.07.2026 03:00", type: "Otomatik · Haftalık", size: "2,2 GB" },
  { date: "10.07.2026 02:00", type: "Manuel", size: "2,1 GB" },
];

const STORAGE_BREAKDOWN = [
  { name: "Veritabanı", value: "18,2 GB" },
  { name: "Belgeler & Dosyalar", value: "5,8 GB" },
  { name: "Fotoğraflar", value: "0,8 GB" },
];

export function BackupScreen() {
  return (
    <>
      <div className="backup-banner">
        <span className="backup-banner__icon" aria-hidden="true">
          ✅
        </span>
        <div>
          <div className="backup-banner__title">Son Yedekleme Başarılı</div>
          <div className="backup-banner__detail">17 Temmuz 2026, 02:00 · 2,4 GB · AWS S3 Frankfurt</div>
        </div>
        <span className="backup-banner__spacer" />
        <button type="button" className="backup-banner__btn" disabled>
          Manuel Yedek Al
        </button>
      </div>

      <div className="backup-grid">
        <SettingsCard>
          <div className="backup-card__title">Otomatik Yedekleme</div>
          <div className="backup-auto-rows">
            <div className="backup-toggle-row">
              <div>
                <div className="backup-toggle-row__name">Günlük Yedekleme</div>
                <div className="backup-toggle-row__sub">Her gün 02:00</div>
              </div>
              <Toggle checked disabled />
            </div>
            <div className="backup-toggle-row">
              <div>
                <div className="backup-toggle-row__name">Haftalık Yedekleme</div>
                <div className="backup-toggle-row__sub">Her Pazar 03:00</div>
              </div>
              <Toggle checked disabled />
            </div>
            <div className="backup-field">
              <span className="backup-field__label">Saklama Süresi</span>
              <Select disabled defaultValue="90">
                <option value="90">90 Gün</option>
              </Select>
            </div>
            <div className="backup-field">
              <span className="backup-field__label">Depolama Konumu</span>
              <Select disabled defaultValue="aws-frankfurt">
                <option value="aws-frankfurt">AWS S3 (Frankfurt)</option>
              </Select>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard>
          <div className="backup-card__title">Depolama Kullanımı</div>
          <div className="storage-stat">24,8 GB</div>
          <div className="storage-stat__total">/ 100 GB toplam</div>
          <div className="storage-bar">
            <div className="storage-bar__fill" style={{ width: "24.8%" }} />
          </div>
          <div className="storage-caption">%24,8 kullanıldı · 75,2 GB boş</div>
          <div className="storage-rows">
            {STORAGE_BREAKDOWN.map((row) => (
              <div className="storage-row" key={row.name}>
                <span>{row.name}</span>
                <span className="storage-row__value">{row.value}</span>
              </div>
            ))}
          </div>
        </SettingsCard>
      </div>

      <div style={{ marginTop: 20 }}>
        <SettingsCard title="Yedek Geçmişi" bodyPad="flush">
          <table className="backup-history">
            <thead>
              <tr>
                <th className="is-first">Tarih</th>
                <th>Tür</th>
                <th className="is-right">Boyut</th>
                <th className="is-center">Durum</th>
                <th className="is-center" />
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((row) => (
                <tr key={row.date}>
                  <td className="is-mono is-first">{row.date}</td>
                  <td>{row.type}</td>
                  <td className="is-mono is-right">{row.size}</td>
                  <td className="is-center">
                    <span className="backup-success-badge">Başarılı</span>
                  </td>
                  <td className="is-center">
                    <button type="button" className="backup-history__restore" disabled>
                      Geri Yükle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SettingsCard>
      </div>

      <p className="settings-note">Bu bölüm örnek verilerle gösterilmektedir.</p>
    </>
  );
}

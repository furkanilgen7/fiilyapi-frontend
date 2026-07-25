"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { useAuditLog, AUDIT_PAGE_SIZE } from "@/lib/api/hooks/useAuditLog";
import { useUsers } from "@/lib/api/hooks/useUsers";
import { downloadAuditExport } from "@/lib/api/audit-client";
import { isForbidden } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/settings/error-message";
import {
  AUDIT_DATE_PRESETS,
  DEFAULT_AUDIT_FILTERS,
  buildAuditFilterQuery,
  type AuditDatePreset,
  type AuditFilters,
} from "@/lib/settings/audit-query";
import {
  AUDIT_ACTION_LABEL,
  auditActorName,
  auditActorRole,
  auditIpText,
  formatAuditTime,
} from "@/lib/settings/audit-format";
import { isAuditAction, type AuditAction } from "@/lib/api/audit-types";
import { cx } from "@/lib/cx";
import "@/components/settings/settings.css";
import "./audit-screen.css";

const ALL_VALUE = "all";
const USER_OPTIONS_LIMIT = 200;

// Mockup'taki işlem seçicisi bu beş seçeneği listeler; `backup` yalnızca tablo
// rozetinde görünür (mockup'ta seçici seçeneği yok — birebir korunur).
const ACTION_OPTIONS: ReadonlyArray<AuditAction> = ["login", "create", "update", "delete", "approve"];

export function AuditLogScreen() {
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_AUDIT_FILTERS);
  const [offset, setOffset] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const auditQuery = useAuditLog(filters, offset);
  const usersQuery = useUsers({ limit: USER_OPTIONS_LIMIT, offset: 0 });

  function updateFilters(patch: Partial<AuditFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadAuditExport(buildAuditFilterQuery(filters));
    } catch (error) {
      setExportError(backendErrorMessage(error, "Excel dosyası indirilemedi."));
    } finally {
      setIsExporting(false);
    }
  }

  const total = auditQuery.data?.total ?? 0;
  const page = Math.floor(offset / AUDIT_PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const filterBar = (
    <div className="audit-filters">
      {/* Mockup'ta kutu içinde büyüteç ikonu var; arama backend'de `q` desteklenmediği
          için kutu görsel olarak birebir ama devre dışı bırakılmış durumda. */}
      <span className="audit-search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Kullanıcı veya işlem ara..."
          aria-label="Kullanıcı veya işlem ara"
          disabled
          title="Metin araması backend'de henüz desteklenmiyor"
        />
      </span>
      <select
        aria-label="Kullanıcı filtresi"
        value={filters.actorUserId ?? ALL_VALUE}
        onChange={(event) =>
          updateFilters({ actorUserId: event.target.value === ALL_VALUE ? null : event.target.value })
        }
      >
        <option value={ALL_VALUE}>Tüm Kullanıcılar</option>
        {usersQuery.data?.items.map((user) => (
          <option key={user.id} value={user.id}>
            {user.full_name}
          </option>
        ))}
      </select>
      <select
        aria-label="İşlem filtresi"
        value={filters.action ?? ALL_VALUE}
        onChange={(event) =>
          updateFilters({ action: isAuditAction(event.target.value) ? event.target.value : null })
        }
      >
        <option value={ALL_VALUE}>Tüm İşlemler</option>
        {ACTION_OPTIONS.map((action) => (
          <option key={action} value={action}>
            {AUDIT_ACTION_LABEL[action]}
          </option>
        ))}
      </select>
      <select
        aria-label="Tarih aralığı"
        value={filters.datePreset}
        onChange={(event) => updateFilters({ datePreset: event.target.value as AuditDatePreset })}
      >
        {AUDIT_DATE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        size="sm"
        className="audit-export"
        onClick={handleExport}
        disabled={isExporting}
      >
        Excel
      </Button>
    </div>
  );

  if (isForbidden(auditQuery.error)) return <AccessDenied />;

  return (
    <>
      {filterBar}

      <SettingsCard bodyPad="flush">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th className="audit-table__center">İşlem</th>
              <th>Detay</th>
              <th>IP Adresi</th>
            </tr>
          </thead>
          <tbody>
            {auditQuery.data?.items.map((item) => (
              <tr key={item.id} className={cx(item.action === "delete" && "audit-row--danger")}>
                <td className="is-mono">{formatAuditTime(item.occurred_at)}</td>
                <td>
                  <div className="audit-user__name">{auditActorName(item.actor)}</div>
                  <div className="audit-user__role">{auditActorRole(item.actor)}</div>
                </td>
                <td className="audit-table__center">
                  <span className={cx("audit-badge", `audit-badge--${item.action}`)}>
                    {AUDIT_ACTION_LABEL[item.action]}
                  </span>
                </td>
                <td>{item.detail}</td>
                <td className="is-mono is-ip">{auditIpText(item.ip_address)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsCard>

      {auditQuery.isLoading && <p className="settings-note">Yükleniyor…</p>}
      {!auditQuery.isLoading && auditQuery.isError && (
        <p className="settings-note settings-note--error">Denetim günlüğü yüklenemedi.</p>
      )}
      {!auditQuery.isLoading && !auditQuery.isError && total === 0 && (
        <p className="settings-note">Seçilen filtrelerle kayıt bulunamadı.</p>
      )}
      {exportError && <p className="settings-note settings-note--error">{exportError}</p>}

      {pageCount > 1 && (
        <div className="audit-pager">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setOffset(Math.max(0, offset - AUDIT_PAGE_SIZE))}
          >
            Önceki
          </Button>
          <span className="audit-pager__label">
            Sayfa {page} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setOffset(offset + AUDIT_PAGE_SIZE)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </>
  );
}

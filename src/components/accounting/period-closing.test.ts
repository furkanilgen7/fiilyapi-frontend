import { describe, expect, it } from "vitest";

import type { AccountingPeriodListItem } from "@/lib/api/hooks/useAccountingPeriods";
import { formatPeriod } from "@/lib/format";

import {
  buildPeriodRows,
  closeButtonDisabledReason,
  derivePeriodRowStatus,
  draftBlockedTitle,
  NO_RECORD_CLOSE_REASON,
  periodBlockReason,
  periodClosedAtText,
  periodClosedByText,
  periodEntryCountText,
  periodRowLabel,
  periodStatusLabel,
  periodSummaryText,
  previousPeriod,
  REOPEN_DISABLED_REASON,
  reopenButtonDisabledReason,
  SEQUENCE_BLOCKED_DETAIL,
  sequenceBlockedTitle,
  summarizePeriodRows,
  WRITE_DISABLED_REASON,
  type PeriodRow,
} from "./period-closing";

function item(partial: Partial<AccountingPeriodListItem>): AccountingPeriodListItem {
  return {
    id: "period-1",
    year: 2026,
    month: 1,
    status: "open",
    closed_at: null,
    closed_by_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    entry_count: 0,
    draft_count: 0,
    closed_by_name: null,
    previous_period_open: false,
    ...partial,
  };
}

describe("K2 — 'engelli' durumu draft_count'tan TÜRETİLİR, backend'den GELMEZ", () => {
  it("kayıt yoksa 'no_record'dür", () => {
    expect(derivePeriodRowStatus(undefined)).toBe("no_record");
  });

  it("status=closed ⇒ 'closed' (draft_count ne olursa olsun)", () => {
    expect(derivePeriodRowStatus(item({ status: "closed", draft_count: 3 }))).toBe("closed");
  });

  it("status=open + draft_count=0 ⇒ 'closable'", () => {
    expect(derivePeriodRowStatus(item({ status: "open", draft_count: 0 }))).toBe("closable");
  });

  it("status=open + draft_count>0 ⇒ 'blocked' (K2'nin ta kendisi)", () => {
    expect(derivePeriodRowStatus(item({ status: "open", draft_count: 3 }))).toBe("blocked");
  });
});

describe("K3 — 'kayıt yok' ayları backend HİÇ döndürmez, ekran TÜRETİR", () => {
  it("on iki ay üretir, Ocak→Aralık sırasıyla", () => {
    const rows = buildPeriodRows(2026, []);
    expect(rows).toHaveLength(12);
    expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rows.every((r) => r.status === "no_record")).toBe(true);
  });

  it("yalnız backend'de kaydı olan aylar kendi durumunu taşır, diğerleri 'no_record'", () => {
    const rows = buildPeriodRows(2026, [
      item({ month: 1, status: "closed" }),
      item({ month: 7, status: "open", draft_count: 2 }),
    ]);
    expect(rows[0].status).toBe("closed");
    expect(rows[6].status).toBe("blocked");
    expect(rows[1].status).toBe("no_record");
    expect(rows[11].status).toBe("no_record");
  });
});

describe("K4 — özet şeridinin dört sayısı SAYILARAK üretilir, sabit YAZILMAZ", () => {
  it("DK:69 örneğiyle aynı dağılımı sayar (6/1/1/4)", () => {
    const items: AccountingPeriodListItem[] = [
      item({ month: 1, status: "closed" }),
      item({ month: 2, status: "closed" }),
      item({ month: 3, status: "closed" }),
      item({ month: 4, status: "closed" }),
      item({ month: 5, status: "closed" }),
      item({ month: 6, status: "closed" }),
      item({ month: 7, status: "open", draft_count: 3 }),
      item({ month: 8, status: "open", draft_count: 0 }),
    ];
    const rows = buildPeriodRows(2026, items);
    const summary = summarizePeriodRows(rows);
    expect(summary).toEqual({ closed: 6, closable: 1, blocked: 1, noRecord: 4 });
    expect(periodSummaryText(summary)).toBe(
      "6 kapalı · 1 kapatılabilir · 1 engelli · 4 kayıt yok",
    );
  });

  it("hiç kayıt yoksa dört sayı da (0/0/0/12)dir", () => {
    const summary = summarizePeriodRows(buildPeriodRows(2026, []));
    expect(summary).toEqual({ closed: 0, closable: 0, blocked: 0, noRecord: 12 });
  });
});

describe("periodStatusLabel — 🔒 emoji TAŞIMAZ (LockIcon ayrı basılır)", () => {
  it("closed ⇒ 'Kapalı'", () => {
    expect(periodStatusLabel("closed")).toBe("Kapalı");
  });
  it("blocked ve closable ⇒ İKİSİ DE 'Açık' (backend'de aynı statü)", () => {
    expect(periodStatusLabel("blocked")).toBe("Açık");
    expect(periodStatusLabel("closable")).toBe("Açık");
  });
  it("no_record ⇒ 'Kayıt yok'", () => {
    expect(periodStatusLabel("no_record")).toBe("Kayıt yok");
  });
});

describe("K1 + K6 — düğme gerekçeleri", () => {
  const row = (status: PeriodRow["status"], overrides?: Partial<AccountingPeriodListItem>): PeriodRow => ({
    year: 2026,
    month: 7,
    status,
    item: status === "no_record" ? undefined : item({ month: 7, ...overrides }),
  });

  it("no_record ⇒ sabit gerekçe, canClose'dan BAĞIMSIZ", () => {
    expect(closeButtonDisabledReason(row("no_record"), true)).toBe(NO_RECORD_CLOSE_REASON);
    expect(closeButtonDisabledReason(row("no_record"), false)).toBe(NO_RECORD_CLOSE_REASON);
  });

  it("blocked ⇒ taslak sayısını İÇEREN gerekçe", () => {
    expect(closeButtonDisabledReason(row("blocked", { draft_count: 3 }), true)).toBe(
      "Dönem kapatılamıyor — 3 taslak fiş var",
    );
  });

  it("closable + yetkisiz ⇒ yazma yetkisi gerekçesi", () => {
    expect(closeButtonDisabledReason(row("closable"), false)).toBe(WRITE_DISABLED_REASON);
  });

  it("closable + yetkili ⇒ gerekçe YOK (düğme aktif)", () => {
    expect(closeButtonDisabledReason(row("closable"), true)).toBeUndefined();
  });

  it("reopen: admin değilse SABİT gerekçe, adminse gerekçe YOK", () => {
    expect(reopenButtonDisabledReason(false)).toBe(REOPEN_DISABLED_REASON);
    expect(reopenButtonDisabledReason(true)).toBeUndefined();
  });
});

describe("K5 — closed_by_name NULL olabilir, 'Bilinmiyor' UYDURULMAZ", () => {
  it("NULL ise tire basar", () => {
    expect(periodClosedByText(item({ closed_by_name: null }))).toBe("—");
    expect(periodClosedByText(undefined)).toBe("—");
  });
  it("doluysa aynen basar", () => {
    expect(periodClosedByText(item({ closed_by_name: "Ayşe Demir" }))).toBe("Ayşe Demir");
  });
});

describe("periodClosedAtText — date-time'ın yalnız TARİH kısmı, noktalı", () => {
  it("kapanmamış dönemde tire", () => {
    expect(periodClosedAtText(item({ closed_at: null }))).toBe("—");
  });
  it("saat damgası taşıyan ISO'dan yalnız gün.ay.yıl basar", () => {
    expect(periodClosedAtText(item({ closed_at: "2026-02-05T10:23:00+00:00" }))).toBe(
      "05.02.2026",
    );
  });
});

describe("periodEntryCountText — DK:63 kaydı olmayan ayda 0 YAZILIR, tire DEĞİL", () => {
  it("kayıt yoksa 0", () => {
    expect(periodEntryCountText(undefined)).toBe("0");
  });
  it("kayıt varsa entry_count", () => {
    expect(periodEntryCountText(item({ entry_count: 218 }))).toBe("218");
  });
});

describe("periodRowLabel", () => {
  it("formatPeriod ile aynı biçimi kullanır", () => {
    expect(periodRowLabel({ year: 2026, month: 1, status: "closed", item: undefined })).toBe(
      "Ocak 2026",
    );
  });
});

/**
 * 🔴 SIRA-B (T2 KIRMIZI) — backend `close_period`e KRONOLOJİK SIRA kapısı
 * eklendi: takvim olarak önceki ay KAYITLI ve `open` ise bu ay kapatılamaz
 * (409). Olgu liste satırında gelir: `previous_period_open` — bir OLGUdur,
 * `can_close` gibi bir KARAR değildir (şema notu).
 *
 * 🔴 K2.1 — bu bloktaki hiçbir metin iddiası ELLE KOPYALANMAZ: beklenen metin
 * `sequenceBlockedTitle`/`draftBlockedTitle`/`SEQUENCE_BLOCKED_DETAIL`
 * ÇAĞRILARAK üretilir. Çıplak "devre-dışı mı" iddiası bekçi DEĞİLDİR — düğme
 * yetki/meşguliyet/taslak yüzünden de devre-dışı olabilir.
 */
describe("SIRA-B — kronolojik sıra kapısı", () => {
  const rowOf = (overrides: Partial<AccountingPeriodListItem>, month = 7): PeriodRow => {
    const backendItem = item({ month, ...overrides });
    return {
      year: 2026,
      month,
      status: derivePeriodRowStatus(backendItem),
      item: backendItem,
    };
  };

  describe("previousPeriod — takvim aritmetiği yıl sınırında KOPMAZ (backend K1'in aynası)", () => {
    it("yıl içinde bir ay geri gider", () => {
      expect(previousPeriod(2026, 3)).toEqual([2026, 2]);
      expect(previousPeriod(2026, 12)).toEqual([2026, 11]);
    });

    it("🔴 Ocak'ın öncesi ÖNCEKİ YILIN Aralığıdır", () => {
      expect(previousPeriod(2026, 1)).toEqual([2025, 12]);
    });
  });

  describe("mesaj sabitleri — metin TEK yerde üretilir (K2.1'in dayanağı)", () => {
    it("draftBlockedTitle MEVCUT metni harfi harfine korur", () => {
      expect(draftBlockedTitle(3)).toBe("Dönem kapatılamıyor — 3 taslak fiş var");
      expect(draftBlockedTitle(0)).toBe("Dönem kapatılamıyor — 0 taslak fiş var");
    });

    it("sequenceBlockedTitle ay adını formatPeriod'den ALIR, elle Türkçe ay dizisi YAZMAZ", () => {
      expect(sequenceBlockedTitle(2026, 3)).toBe(
        `Dönem kapatılamıyor — önce ${formatPeriod(2026, 2)} kapatılmalı`,
      );
    });

    it("🔴 YIL SINIRI: Ocak'ın başlığı 'Aralık 2025' der (previousPeriod'a dayanır)", () => {
      const [py, pm] = previousPeriod(2026, 1);
      expect(sequenceBlockedTitle(2026, 1)).toBe(
        `Dönem kapatılamıyor — önce ${formatPeriod(py, pm)} kapatılmalı`,
      );
      expect(sequenceBlockedTitle(2026, 1)).toContain(formatPeriod(2025, 12));
      expect(formatPeriod(2025, 12)).toBe("Aralık 2025"); // dizinin kendisi de bir kez pinlenir
    });

    it("SEQUENCE_BLOCKED_DETAIL boş olmayan bir metindir (K3.2 yanlış-yeşil korkuluğu)", () => {
      expect(typeof SEQUENCE_BLOCKED_DETAIL).toBe("string");
      expect(SEQUENCE_BLOCKED_DETAIL.length).toBeGreaterThan(0);
    });
  });

  describe("derivePeriodRowStatus — backend kapı SIRASININ aynası (TASLAK önce, SIRA sonra)", () => {
    it("(a) önceki dönem AÇIK + kendi taslağı YOK ⇒ 'blocked_sequence' ve gerekçe SIRA metnidir", () => {
      const row = rowOf({ status: "open", draft_count: 0, previous_period_open: true });
      expect(row.status).toBe("blocked_sequence");
      expect(closeButtonDisabledReason(row, true)).toBe(sequenceBlockedTitle(2026, 7));
    });

    it("(b) önceki dönem KAPALI/kayıtsız + taslak yok ⇒ 'closable', gerekçe YOK", () => {
      const row = rowOf({ status: "open", draft_count: 0, previous_period_open: false });
      expect(row.status).toBe("closable");
      expect(periodBlockReason(row)).toBeUndefined();
      expect(closeButtonDisabledReason(row, true)).toBeUndefined();
    });

    it("(c) 🔴 İKİ ENGEL BİRDEN ⇒ TASLAK kazanır (kullanıcı ÖNCE kendi dönemindeki eksiği duyar)", () => {
      const row = rowOf({ status: "open", draft_count: 3, previous_period_open: true });
      expect(row.status).toBe("blocked");
      expect(periodBlockReason(row)).toBe(draftBlockedTitle(3));
      // Öncelik GERÇEKTEN ölçülsün: sonuç sıra metnine EŞİT OLMAMALI.
      expect(periodBlockReason(row)).not.toBe(sequenceBlockedTitle(2026, 7));
      expect(closeButtonDisabledReason(row, true)).toBe(draftBlockedTitle(3));
    });

    it("(d) kapalı dönem previous_period_open'dan ETKİLENMEZ", () => {
      const row = rowOf({ status: "closed", draft_count: 0, previous_period_open: true });
      expect(row.status).toBe("closed");
      expect(periodBlockReason(row)).toBeUndefined();
    });

    it("(e) kaydı olmayan ay ETKİLENMEZ: 'no_record' + sabit gerekçe", () => {
      const row: PeriodRow = { year: 2026, month: 9, status: "no_record", item: undefined };
      expect(derivePeriodRowStatus(undefined)).toBe("no_record");
      expect(closeButtonDisabledReason(row, true)).toBe(NO_RECORD_CLOSE_REASON);
      expect(periodBlockReason(row)).toBeUndefined();
    });
  });

  describe("closeButtonDisabledReason periodBlockReason'a DELEGE eder (ikinci `if` yasak)", () => {
    it("her iki engel türünde de gerekçe periodBlockReason'ın DÖNDÜRDÜĞÜ metnin AYNISIdır", () => {
      const sequenceRow = rowOf({ status: "open", draft_count: 0, previous_period_open: true });
      const draftRow = rowOf({ status: "open", draft_count: 2, previous_period_open: false });
      expect(closeButtonDisabledReason(sequenceRow, true)).toBe(periodBlockReason(sequenceRow));
      expect(closeButtonDisabledReason(draftRow, true)).toBe(periodBlockReason(draftRow));
      expect(periodBlockReason(sequenceRow)).toBe(sequenceBlockedTitle(2026, 7));
      expect(periodBlockReason(draftRow)).toBe(draftBlockedTitle(2));
    });
  });

  describe("(g) özet şeridi — DK:91 DÖRT sayıdır, beşinci sayı mockup'ı BOZAR", () => {
    it("doğrudan bir 'blocked_sequence' satırı 'blocked' SAYACINI artırır", () => {
      const rows: PeriodRow[] = [
        { year: 2026, month: 7, status: "blocked_sequence", item: item({ month: 7 }) },
      ];
      const summary = summarizePeriodRows(rows);
      expect(summary.blocked).toBe(1);
      expect(summary.closable).toBe(0);
      expect(summary.noRecord).toBe(0);
    });

    it("ızgara üstünden: sıra-engelli ay 'engelli' sayılır ve metin yine DÖRT sayı basar", () => {
      const rows = buildPeriodRows(2026, [
        item({ month: 6, status: "open", draft_count: 0, previous_period_open: false }),
        item({ month: 7, status: "open", draft_count: 0, previous_period_open: true }),
      ]);
      const summary = summarizePeriodRows(rows);
      expect(summary).toEqual({ closed: 0, closable: 1, blocked: 1, noRecord: 10 });
      // Beşinci sayaç EKLENMEZ: anahtar kümesi tam olarak bu dörttür.
      expect(Object.keys(summary).sort()).toEqual(["blocked", "closable", "closed", "noRecord"]);
      expect(periodSummaryText(summary)).toBe(
        "0 kapalı · 1 kapatılabilir · 1 engelli · 10 kayıt yok",
      );
    });
  });

  describe("(h) rozet metni — backend statüsü hâlâ `open`", () => {
    it("blocked_sequence ⇒ 'Açık' (blocked/closable ile AYNI)", () => {
      expect(periodStatusLabel("blocked_sequence")).toBe("Açık");
      expect(periodStatusLabel("blocked_sequence")).toBe(periodStatusLabel("blocked"));
    });
  });
});

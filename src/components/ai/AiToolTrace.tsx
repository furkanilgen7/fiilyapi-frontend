"use client";

import type { AiEvent } from "@/lib/api/ai-chat-client";
import "./ai-panel.css";

/**
 * Araç çağrısı izi — **korkuluk (c)'nin kullanıcıya dönük yüzü** (spec §6).
 *
 * 🔴 HER araç çağrısı EKRANDA görünür ve gizlenemez. Sebep: depolanmış prompt
 * enjeksiyonuna (S6) karşı son savunma modelin özeti DEĞİL, kullanıcının
 * gözüdür. Model "3 proje buldum" derken zarf `Restricted` diyorsa çelişki
 * burada görünür. İz varsayılan olarak KAPALI basılsaydı, kimse açmayacağı
 * için hiç var olmamış olurdu.
 */

/** Zarf hâli → kullanıcıya dönük etiket. `hal` adları backend `result.py`den. */
const HAL_ETIKETI: Record<string, string> = {
  Ok: "veri geldi",
  Empty: "kayıt yok",
  ScopedEmpty: "kapsamınızda yok",
  Restricted: "yetkiniz yok",
  NotFound: "bulunamadı",
  Truncated: "KIRPILDI",
  ToolError: "çalışamadı",
};

/** Hâl → görsel ton. `Restricted`/`Truncated`/`ToolError` sessiz kalmamalı. */
const HAL_TONU: Record<string, string> = {
  Ok: "ok",
  Empty: "notr",
  ScopedEmpty: "uyari",
  Restricted: "uyari",
  NotFound: "notr",
  Truncated: "uyari",
  ToolError: "hata",
};

export interface AiToolTraceProps {
  /** Bu çağrı için görülen `arac_basladi` / `arac_sonuc` olayları. */
  aracAdi: string;
  sonuc?: Extract<AiEvent, { tip: "arac_sonuc" }>;
}

export function AiToolTrace({ aracAdi, sonuc }: AiToolTraceProps) {
  const ton = sonuc ? (HAL_TONU[sonuc.hal] ?? "notr") : "bekliyor";
  const etiket = sonuc ? (HAL_ETIKETI[sonuc.hal] ?? sonuc.hal) : "çalışıyor…";

  return (
    <div className={`ai-trace ai-trace--${ton}`} data-testid="ai-arac-izi">
      <div className="ai-trace__head">
        <span className="ai-trace__icon" aria-hidden="true">
          ⚙
        </span>
        <code className="ai-trace__name">{aracAdi}</code>
        <span className="ai-trace__state">{etiket}</span>
        {sonuc?.satir_sayisi !== null && sonuc?.satir_sayisi !== undefined ? (
          <span className="ai-trace__rows">{sonuc.satir_sayisi} kayıt</span>
        ) : null}
      </div>
      {/* 🔴 Zarfın KENDİ cümlesi birebir basılır — modelin yeniden anlattığı
          hâli değil. İkisi ayrışırsa kullanıcı bunu görür. */}
      {sonuc ? <p className="ai-trace__msg">{sonuc.mesaj}</p> : null}
    </div>
  );
}

/**
 * F-UNIT2 · EI 76 dosya seçiminin İSTEMCİ ÖN KONTROLÜ.
 *
 * Amaç: kullanıcı 8 MB'lık bir `.csv`yi yükleyip beklemek yerine sebebi
 * ANINDA öğrensin. Kontroller sunucunun kendi sırasıyla yapılır
 * (`importer.py`: önce `ensure_xlsx`, sonra `ensure_size`), mesajlar da
 * ORADAN kopyadır — istemcinin kendi cümlesini kurması iki metni zamanla
 * ayrıştırırdı.
 *
 * 🔴 BU TEK SAVUNMA HATTI DEĞİLDİR. Sunucu aynı kontrolleri yeniden yapar ve
 * boyutu İKİ KEZ ölçer. Bu modülün `ok: true` demesi bir GARANTİ DEĞİLDİR:
 * satır sayısı (1000), başlık eksikliği ve dosyanın gerçekten `.xlsx`
 * olup olmadığı YALNIZ sunucuda anlaşılır. Çağıran, bu kontrol geçti diye
 * bir sunucu hatasını ASLA bastırmaz (`IMPORT_SERVER_RECHECK_NOTE`).
 */

import {
  IMPORT_ACCEPT,
  IMPORT_BAD_TYPE_MESSAGE,
  IMPORT_MAX_BYTES,
  IMPORT_TOO_LARGE_MESSAGE,
} from "./constants";

/**
 * `File`ın SAF yüzeyi. Tam `File` tipini istemek bu modülü DOM'a bağlardı;
 * testler iki alanla kurulur.
 */
export interface ImportFileFacts {
  name: string;
  size: number;
}

export type ImportFileCheck = { ok: true } | { ok: false; message: string };

export function checkImportFile(file: ImportFileFacts): ImportFileCheck {
  // `ensure_xlsx` ile aynı gövde: `filename.lower().endswith(".xlsx")`.
  if (!file.name.toLowerCase().endsWith(IMPORT_ACCEPT)) {
    return { ok: false, message: IMPORT_BAD_TYPE_MESSAGE };
  }

  // `ensure_size` ile aynı sınır: `size > MAX_IMPORT_BYTES` reddedilir —
  // yani TAM 2 MB (2097152 bayt) GEÇER, bir bayt fazlası GEÇMEZ.
  if (file.size > IMPORT_MAX_BYTES) {
    return { ok: false, message: IMPORT_TOO_LARGE_MESSAGE };
  }

  return { ok: true };
}

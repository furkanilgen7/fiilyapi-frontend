// @vitest-environment node
//
// Metin envanteri kapısı (plan TZ-10, spec §15). Ekranda görünen ve §15
// listesinde OLMAYAN hiçbir dize yazılamaz. Bu test, şantiye formunun sabit
// dizelerini spec §15 bölümünün metniyle karşılaştırır.
//
// KAPSAM UYARISI: yalnız SABİTLERİ kapsar (constants.ts, facility-items.ts,
// document-items.ts, validate.ts). JSX içine gömülü etiketler bileşen
// testlerinde tek tek sabitlenir; buradaki gate onların yerine geçmez.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  LINKED_PROJECT_TITLE,
  SELECT_PLACEHOLDER,
  SITE_STATUS_OPTIONS,
  USER_LIST_NOTES,
} from "./constants";
import {
  SITE_DOCUMENTS,
  SITE_DOCUMENTS_DROP_SUBTITLE,
  SITE_DOCUMENTS_DROP_TITLE,
  SITE_DOCUMENTS_NOTE,
  SITE_DOCUMENTS_TITLE,
} from "./document-items";
import { SITE_FACILITIES, STORAGE_FACILITIES } from "./facility-items";
import { SECTION_MESSAGES } from "./sections-validate";
import { MESSAGES } from "./validate";

const specPath = fileURLToPath(
  new URL("../../../docs/superpowers/specs/2026-07-30-santiye-formu-design.md", import.meta.url),
);
const spec = readFileSync(specPath, "utf8");
const inventory = spec.slice(spec.indexOf("## 15. Metin envanteri"), spec.indexOf("## 16."));

/** §10 doğrulama mesajları envanterin #82 satırıyla §10 tablolarına devredilir. */
const validationSection = spec.slice(spec.indexOf("## 10. Doğrulama"), spec.indexOf("## 11."));

function expectInInventory(text: string) {
  expect(inventory, `"${text}" spec §15 envanterinde YOK`).toContain(text);
}

describe("metin envanteri — seçici ve durum dizeleri", () => {
  it("secici yer tutucusu ve kilitli proje aciklamasi envanterdedir", () => {
    expectInInventory(SELECT_PLACEHOLDER);
    expectInInventory(LINKED_PROJECT_TITLE);
  });

  it("uc durum etiketi envanterdedir", () => {
    for (const option of SITE_STATUS_OPTIONS) expectInInventory(option.label);
  });

  it("kisi listesi notlarinin dordu de envanterdedir (403 notu dahil)", () => {
    for (const note of Object.values(USER_LIST_NOTES)) expectInInventory(note);
  });
});

describe("metin envanteri — kutucuk ve belge dizeleri", () => {
  it("sekiz tesis kutucugu etiketi envanterdedir", () => {
    for (const item of [...STORAGE_FACILITIES, ...SITE_FACILITIES]) {
      expectInInventory(item.label);
    }
  });

  it("alti belge kutusunun basligi ve alt metni envanterdedir", () => {
    for (const doc of SITE_DOCUMENTS) {
      expectInInventory(doc.title);
      expectInInventory(doc.subtitle);
    }
  });

  it("belge kart basligi, notu ve surukle-birak metinleri envanterdedir", () => {
    expectInInventory(SITE_DOCUMENTS_TITLE);
    expectInInventory(SITE_DOCUMENTS_NOTE);
    expectInInventory(SITE_DOCUMENTS_DROP_TITLE);
    expectInInventory(SITE_DOCUMENTS_DROP_SUBTITLE);
  });
});

describe("metin envanteri — doğrulama mesajları (§15/82 → §10)", () => {
  it("her dogrulama mesaji spec §10'da birebir gecer", () => {
    for (const message of Object.values(MESSAGES)) {
      expect(validationSection, `"${message}" spec §10'da YOK`).toContain(message);
    }
  });

  it("her bolum mesaji spec §10'da birebir gecer", () => {
    for (const message of Object.values(SECTION_MESSAGES)) {
      expect(validationSection, `"${message}" spec §10'da YOK`).toContain(message);
    }
  });
});

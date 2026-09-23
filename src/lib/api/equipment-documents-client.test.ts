import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { uploadEquipmentDocument, downloadEquipmentDocument } from "./equipment-documents-client";
import { BackendError } from "./unwrap";

// KAYIT 452 · `documents-client.test.ts` kanonu birebir: bu dosyanın hiç
// testi yoktu, `uploadEquipmentDocument`/`downloadEquipmentDocument` gövdesi
// hiçbir seviyede (birim/e2e) hiç koşmuyordu.

const EQUIPMENT_ID = "33333333-3333-3333-3333-333333333333";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadEquipmentDocument", () => {
  const file = new File(["binary"], "ruhsat.pdf", { type: "application/pdf" });

  it("Content-Type başlığı ELLE KURULMAZ (boundary tarayıcıdan)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: "d-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadEquipmentDocument({ equipmentId: EQUIPMENT_ID, file, typeId: "t-1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/backend/equipment/${EQUIPMENT_ID}/documents`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("FormData alanları file/type_id adlarıyla gider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: "d-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadEquipmentDocument({ equipmentId: EQUIPMENT_ID, file, typeId: "t-1" });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("type_id")).toBe("t-1");
  });

  it("validUntil VERİLMEZSE forma HİÇ eklenmez (boş dize değil, yokluk)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: "d-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadEquipmentDocument({ equipmentId: EQUIPMENT_ID, file, typeId: "t-1" });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.has("valid_until")).toBe(false);
  });

  it("validUntil verilirse gövdeye eklenir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: "d-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadEquipmentDocument({
      equipmentId: EQUIPMENT_ID,
      file,
      typeId: "t-1",
      validUntil: "2027-01-01",
    });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get("valid_until")).toBe("2027-01-01");
  });

  it("oluşturulan belge künyesini döndürür", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(201, { id: "d-1" })));
    const created = await uploadEquipmentDocument({
      equipmentId: EQUIPMENT_ID,
      file,
      typeId: "t-1",
    });
    expect(created.id).toBe("d-1");
  });

  it.each([
    [413, "Dosya boyutu sınırı aşıldı."],
    [422, "Bu dosya türü kabul edilmiyor."],
  ])("%s yanıtında BackendError fırlatır, gövde YUTULMAZ", async (status, detail) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(status, { detail })));
    await expect(
      uploadEquipmentDocument({ equipmentId: EQUIPMENT_ID, file, typeId: "t-1" }),
    ).rejects.toMatchObject({ status, body: { detail } });
  });

  it("hata BackendError tipindedir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(422, { detail: "red" })));
    await expect(
      uploadEquipmentDocument({ equipmentId: EQUIPMENT_ID, file, typeId: "t-1" }),
    ).rejects.toBeInstanceOf(BackendError);
  });
});

describe("downloadEquipmentDocument", () => {
  it("belge kimliği ekipman kimliği OLMADAN documents/ altından indirilir", async () => {
    const anchor = document.createElement("a");
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await downloadEquipmentDocument("doc-9", "belge.pdf");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/equipment/documents/doc-9/download",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    expect(anchor.download).toBe("belge.pdf");
  });
});

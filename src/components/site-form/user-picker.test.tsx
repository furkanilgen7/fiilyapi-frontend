import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { USER_LIST_NOTES } from "./constants";
import {
  UserPickerOptions,
  isUserListUnavailable,
  isUserPickerDisabled,
  userPickerNote,
  withDescribedBy,
  type UserPickerState,
} from "./user-picker";

const OPTIONS = [
  { id: "u1", full_name: "Ali Vural", title: "Şantiye Şefi" },
  { id: "u2", full_name: "Ayşe Kaya", title: null },
];

function state(overrides: Partial<UserPickerState> = {}): UserPickerState {
  return { options: OPTIONS, isLoading: false, isError: false, isForbidden: false, ...overrides };
}

describe("isUserListUnavailable — şef zorunluluğunun kapısı (spec §10.1.1)", () => {
  it("liste geldiginde false", () => {
    expect(isUserListUnavailable(state())).toBe(false);
  });

  it("403'te true", () => {
    expect(isUserListUnavailable(state({ isError: true, isForbidden: true }))).toBe(true);
  });

  it("403 disi hatada da true (kullanici yine secim yapamaz)", () => {
    expect(isUserListUnavailable(state({ isError: true }))).toBe(true);
  });

  it("yalnizca yuklenirken false kalir (liste henuz gelmedi, hata yok)", () => {
    expect(isUserListUnavailable(state({ isLoading: true }))).toBe(false);
  });
});

describe("isUserPickerDisabled", () => {
  it("yuklenirken ve hatada disabled, normalde degil", () => {
    expect(isUserPickerDisabled(state({ isLoading: true }))).toBe(true);
    expect(isUserPickerDisabled(state({ isError: true }))).toBe(true);
    expect(isUserPickerDisabled(state())).toBe(false);
  });
});

describe("userPickerNote — sessiz boş açılır liste yasağı (plan TZ-4b)", () => {
  it("hicbir durumda bos dize donmez", () => {
    const states = [
      state(),
      state({ isLoading: true }),
      state({ isError: true }),
      state({ isError: true, isForbidden: true }),
    ];
    for (const s of states) expect(userPickerNote(s).length).toBeGreaterThan(0);
  });

  it("403'te §15/23b metni doner", () => {
    expect(userPickerNote(state({ isError: true, isForbidden: true }))).toBe(
      USER_LIST_NOTES.forbidden,
    );
  });

  it("403 disi hatada 'Kullanicilar yuklenemedi' doner", () => {
    expect(userPickerNote(state({ isError: true }))).toBe(USER_LIST_NOTES.error);
  });

  it("yuklenirken 'Yukleniyor…' doner", () => {
    expect(userPickerNote(state({ isLoading: true }))).toBe(USER_LIST_NOTES.loading);
  });

  it("normalde §15/23a tamamlanmamis liste notu doner", () => {
    expect(userPickerNote(state())).toBe(USER_LIST_NOTES.incomplete);
  });
});

describe("UserPickerOptions", () => {
  it("yuklenirken tek bilgi secenegi basar", () => {
    render(
      <select aria-label="secici">
        <UserPickerOptions state={state({ isLoading: true })} />
      </select>,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(USER_LIST_NOTES.loading);
  });

  it("liste geldiginde yer tutucu + her kullanici icin bir secenek basar", () => {
    render(
      <select aria-label="secici">
        <UserPickerOptions state={state()} />
      </select>,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveTextContent("Ali Vural (Şantiye Şefi)");
    expect(options[2]).toHaveTextContent("Ayşe Kaya");
  });

  it("403'te yalnizca yer tutucu kalir — form yine gonderilebilir", () => {
    render(
      <select aria-label="secici">
        <UserPickerOptions state={state({ options: [], isError: true, isForbidden: true })} />
      </select>,
    );
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });
});

describe("withDescribedBy — mevcut açıklamayı EZMEZ", () => {
  it("Field'in urettigi aria-describedby korunur ve yenisi eklenir", () => {
    expect(withDescribedBy({ id: "x", "aria-describedby": "hint-1" }, "note-1")).toEqual({
      id: "x",
      "aria-describedby": "hint-1 note-1",
    });
  });

  it("mevcut aciklama yoksa yalniz yenisi yazilir", () => {
    expect(withDescribedBy({ id: "x" }, "note-1")["aria-describedby"]).toBe("note-1");
  });

  it("girdi nesnesini MUTASYONA UGRATMAZ", () => {
    const control = { id: "x", "aria-describedby": "hint-1" };
    withDescribedBy(control, "note-1");
    expect(control["aria-describedby"]).toBe("hint-1");
  });
});

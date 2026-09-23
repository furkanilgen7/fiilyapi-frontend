import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSyncedFieldState } from "./useSyncedFieldState";

describe("useSyncedFieldState", () => {
  it("ilk değeri sunucudan alır", () => {
    const { result } = renderHook(() => useSyncedFieldState("9"));
    expect(result.current[0]).toBe("9");
  });

  it("🔴 KANON: sunucu değeri değişince yerel state SENKRONİZE OLUR (bileşen remount olmasa bile)", () => {
    const { result, rerender } = renderHook(({ value }) => useSyncedFieldState(value), {
      initialProps: { value: "9" },
    });

    rerender({ value: "12" });

    expect(result.current[0]).toBe("12");
  });

  it("kullanıcının yerel düzenlemesi sunucu değeri aynı kalırken KORUNUR", () => {
    const { result, rerender } = renderHook(({ value }) => useSyncedFieldState(value), {
      initialProps: { value: "9" },
    });

    act(() => result.current[1]("9.5"));
    rerender({ value: "9" });

    expect(result.current[0]).toBe("9.5");
  });

  it("odaktayken (isEditing=true) gelen sunucu değeri kullanıcının yazdığını EZMEZ", () => {
    let editing = true;
    const { result, rerender } = renderHook(
      ({ value }) => useSyncedFieldState(value, () => editing),
      { initialProps: { value: "9" } },
    );

    act(() => result.current[1]("9.5"));
    rerender({ value: "12" });
    expect(result.current[0]).toBe("9.5");

    // Odak bırakılınca bir sonraki sunucu değeri normal şekilde işlenir.
    editing = false;
    rerender({ value: "15" });
    expect(result.current[0]).toBe("15");
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("ilk değeri anında döner", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 300));
    expect(result.current).toBe("a");
  });

  it("gecikme dolmadan yeni değeri yayınlamaz", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => void vi.advanceTimersByTime(299));

    expect(result.current).toBe("a");
  });

  it("hızlı ardışık değişimlerde yalnızca son değeri yayınlar", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => void vi.advanceTimersByTime(100));
    rerender({ value: "abc" });
    act(() => void vi.advanceTimersByTime(300));

    expect(result.current).toBe("abc");
  });
});

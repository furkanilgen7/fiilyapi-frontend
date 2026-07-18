import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "./SessionProvider";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

function Probe() {
  const { me, isLoading } = useSession();
  if (isLoading) return <span>yukleniyor</span>;
  return <span>{me?.full_name ?? "yok"}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("SessionProvider", () => {
  it("me verisini context'e saglar", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }), { status: 200 }),
    );
    render(<SessionProvider><Probe /></SessionProvider>);
    expect(await screen.findByText("Ahmet Yılmaz")).toBeInTheDocument();
  });

  it("401'de /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("me'yi yalnizca bir kez fetch eder", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ali", role_key: "x", title: "y" }), { status: 200 }),
    );
    render(<SessionProvider><Probe /></SessionProvider>);
    await screen.findByText("Ali");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

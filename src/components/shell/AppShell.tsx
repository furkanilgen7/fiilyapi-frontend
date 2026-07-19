"use client";

import { SessionProvider } from "./SessionProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "./shell.css";

// Uygulama kabugu: oturum saglayici + query saglayici + sabit topbar/sidebar + icerik.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <Topbar />
        <Sidebar />
        <main className="app-content">{children}</main>
      </QueryProvider>
    </SessionProvider>
  );
}

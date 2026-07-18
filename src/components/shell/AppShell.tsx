"use client";

import { SessionProvider } from "./SessionProvider";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "./shell.css";

// Uygulama kabugu: oturum saglayici + sabit topbar/sidebar + icerik alani.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Topbar />
      <Sidebar />
      <main className="app-content">{children}</main>
    </SessionProvider>
  );
}

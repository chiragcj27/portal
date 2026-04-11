"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image,
  Tag,
  Layers,
  PackagePlus,
  LogOut,
  Gem,
  Menu,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { clearAdminTokenFromStorage } from "@/lib/admin-auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Banners", href: "/banners", icon: Image },
  { label: "Media library", href: "/media-library", icon: UploadCloud },
  { label: "Categories", href: "/categories", icon: Tag },
  { label: "Subcategories", href: "/subcategories", icon: Layers },
  { label: "Products", href: "/products", icon: PackagePlus },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function onLogout() {
    clearAdminTokenFromStorage();
    router.replace("/login");
  }

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Gem className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
        <span className="text-sm font-semibold text-slate-900">Chandra Admin</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              type="button"
              onClick={() => { router.push(href); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 lg:flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import SideNav from "@/components/SideNav";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <SideNav />
        <main className="min-w-0 flex-1 px-4 py-8 pt-16 md:px-8 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

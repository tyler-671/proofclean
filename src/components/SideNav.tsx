"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  Squares2X2Icon,
  UserIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const settingsItem = { href: "/settings", label: "Settings", icon: Cog6ToothIcon };

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Squares2X2Icon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/cleaners", label: "Cleaners", icon: UserIcon },
];

function ProofCleanWordmark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 40"
      className="h-8 w-auto"
      aria-label="ProofClean"
      role="img"
    >
      <text
        x="0"
        y="30"
        fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
        fontSize="28"
        fontWeight="700"
        fill="#111827"
      >
        Proof
      </text>
      <text
        x="76"
        y="30"
        fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
        fontSize="28"
        fontWeight="700"
        fill="#10b981"
      >
        Clean
      </text>
    </svg>
  );
}

type SidebarContentProps = {
  onNavigate?: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  forceExpanded?: boolean;
};

function SidebarContent({
  onNavigate,
  onSignOut,
  isSigningOut,
  forceExpanded = false,
}: SidebarContentProps) {
  const pathname = usePathname();

  const labelClass = forceExpanded
    ? "overflow-hidden whitespace-nowrap text-sm"
    : "max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 ease-out group-hover:max-w-[12rem] group-hover:opacity-100";

  const rowClass = forceExpanded
    ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
    : "flex w-full items-center justify-center gap-3 rounded-lg px-2.5 py-2.5 transition-all duration-200 ease-out group-hover:justify-start group-hover:px-3";

  return (
    <>
      <div
        className={
          forceExpanded
            ? "px-5 py-5"
            : "flex items-center justify-center px-2 py-5 transition-all duration-200 ease-out group-hover:justify-start group-hover:px-5"
        }
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="block transition hover:opacity-80"
          aria-label="ProofClean home"
        >
          {forceExpanded ? (
            <ProofCleanWordmark />
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-base font-bold text-white transition-opacity duration-200 group-hover:hidden">
                P
              </span>
              <span className="hidden group-hover:block">
                <ProofCleanWordmark />
              </span>
            </>
          )}
        </Link>
      </div>

      <div
        className={
          forceExpanded
            ? "mx-5 border-t border-slate-200"
            : "mx-3 border-t border-slate-200 transition-all duration-200 ease-out group-hover:mx-5"
        }
      />

      <nav className={forceExpanded ? "flex-1 space-y-1 px-3 py-4" : "flex-1 space-y-1 px-2 py-4 group-hover:px-3"}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={item.label}
              className={
                isActive
                  ? `${rowClass} bg-emerald-50 text-sm font-semibold text-emerald-700`
                  : `${rowClass} text-sm font-medium text-slate-600 hover:bg-slate-50`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className={labelClass}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={forceExpanded ? "mt-auto px-3 pb-5" : "mt-auto px-2 pb-5 group-hover:px-3"}>
        <div
          className={
            forceExpanded
              ? "mx-2 mb-3 border-t border-slate-200"
              : "mx-1 mb-3 border-t border-slate-200 transition-all duration-200 ease-out group-hover:mx-2"
          }
        />
        {(() => {
          const isActive = pathname === settingsItem.href;
          const SettingsIcon = settingsItem.icon;

          return (
            <Link
              href={settingsItem.href}
              onClick={onNavigate}
              aria-label={settingsItem.label}
              className={
                isActive
                  ? `${rowClass} bg-emerald-50 text-sm font-semibold text-emerald-700`
                  : `${rowClass} text-sm font-medium text-slate-600 hover:bg-slate-50`
              }
            >
              <SettingsIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span className={labelClass}>{settingsItem.label}</span>
            </Link>
          );
        })()}
        <div
          className={
            forceExpanded
              ? "mx-2 mb-3 mt-3 border-t border-slate-200"
              : "mx-1 mb-3 mt-3 border-t border-slate-200 transition-all duration-200 ease-out group-hover:mx-2"
          }
        />
        <button
          type="button"
          onClick={onSignOut}
          disabled={!supabase || isSigningOut}
          aria-label="Sign out"
          className={`${rowClass} text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden />
          <span className={labelClass}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </span>
        </button>
      </div>
    </>
  );
}

export default function SideNav() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onSignOut = async () => {
    if (!supabase) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Bars3Icon className="h-5 w-5 text-slate-700" aria-hidden />
      </button>

      {/* Desktop: 60px reserved slot; full sidebar expands to 240px as overlay on hover */}
      <div className="relative hidden w-[60px] shrink-0 self-stretch md:block">
        <aside className="group absolute left-0 top-0 z-40 flex min-h-screen w-[60px] flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 ease-out hover:w-60 hover:shadow-lg">
          <SidebarContent onSignOut={() => void onSignOut()} isSigningOut={isSigningOut} />
        </aside>
      </div>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closeMobile}
            aria-hidden
          />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-slate-200 bg-white md:hidden">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-50"
                onClick={closeMobile}
                aria-label="Close menu"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="-mt-2 flex flex-1 flex-col">
              <SidebarContent
                forceExpanded
                onNavigate={closeMobile}
                onSignOut={() => void onSignOut()}
                isSigningOut={isSigningOut}
              />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

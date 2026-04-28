"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Home,
  LogOut,
  Mail,
  MoreHorizontal,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Header({ email }: { email?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const bottomMenu = [
    ["Domov", "/dashboard", Home],
    ["Dojo", "/dojos", Building2],
    ["Žiaci", "/students", Users],
    ["Tréneri", "/trainers", Users],
    ["Viac", "/topics", MoreHorizontal],
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f7f2e8]/95 pt-[54px] backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <Image
                src="/logo.png"
                alt="DOKAN Bratislava"
                width={44}
                height={44}
                className="rounded-full border border-black/10 object-cover"
                priority
              />

              <div className="min-w-0">
                <p className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.03em] text-[#111]">
                  DOKAN
                </p>
                <p className="truncate text-xs font-medium text-black/50">
                  Trénerská zóna
                </p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white active:scale-[0.98]"
            >
              <LogOut size={16} />
              Odhlásiť
            </button>
          </div>

          {email && (
            <p className="truncate pb-1 text-xs text-black/40">{email}</p>
          )}
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 px-3 pb-safe pt-2 backdrop-blur shadow-[0_-6px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomMenu.map(([label, href, Icon]) => {
            const active =
              pathname === href ||
              (href === "/dashboard" && pathname === "/") ||
              (href !== "/dashboard" && pathname.startsWith(href as string));

            return (
              <Link
                key={href}
                href={href as string}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition active:scale-[0.96] ${
                  active ? "bg-[#111] text-white" : "text-black/55"
                }`}
              >
                <Icon size={21} />
                <span className="mt-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
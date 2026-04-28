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

  const menu = [
    ["Dashboard", "/dashboard", Home],
    ["Dojo", "/dojos", Building2],
    ["Žiaci", "/students", Users],
    ["Tréneri", "/trainers", Users],
    ["Témy", "/topics", BookOpen],
    ["Tréningy", "/trainings", CalendarDays],
    ["Semináre", "/events", CalendarDays],
    ["Štatistiky", "/stats", BarChart3],
    ["Emaily", "/emails", Mail],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f2e8]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-safe">
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

        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {menu.map(([label, href, Icon]) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href as string}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#111] text-white"
                    : "bg-white/70 text-black/70 active:bg-black/5"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {email && (
          <p className="mt-2 truncate text-xs text-black/40">{email}</p>
        )}
      </div>
    </header>
  );
}
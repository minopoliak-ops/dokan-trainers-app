
"use client";

import { createClient } from "@/lib/supabase/browser";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header({ email }: { email?: string }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menu = [
    ["Dashboard", "/dashboard"],
    ["Dojo", "/dojos"],
    ["Žiaci", "/students"],
    ["Tréneri", "/trainers"],
    ["Témy", "/topics"],
    ["Tréningy", "/trainings"],
    ["Semináre", "/events"],
    ["Štatistiky", "/stats"],
    ["Emaily", "/emails"]
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-brand-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">

        {/* LOGO */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Dokan Bratislava"
            className="h-12 w-12 rounded-full object-cover border border-black/10"
          />
          <span className="whitespace-nowrap font-bold tracking-tight text-base">
            DOKAN <span className="text-brand-red">Trénerská zóna</span>
          </span>
        </Link>

        {/* MENU */}
        <nav className="flex gap-2 overflow-x-auto">
          {menu.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-xl px-3 py-1 text-sm hover:bg-black/5"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* USER */}
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-black/60 sm:inline">{email}</span>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-1 text-white hover:opacity-80"
          >
            <LogOut size={16} /> Odhlásiť
          </button>
        </div>

      </div>
    </header>
  );
}

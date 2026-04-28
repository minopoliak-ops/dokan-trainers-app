"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  Building2,
  Home,
  LogOut,
  MoreHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  Icon: LucideIcon;
};

export default function Header({ email }: { email?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const bottomMenu: MenuItem[] = [
    { label: "Domov", href: "/dashboard", Icon: Home },
    { label: "Dojo", href: "/dojos", Icon: Building2 },
    { label: "Žiaci", href: "/students", Icon: Users },
    { label: "Tréneri", href: "/trainers", Icon: Users },
    { label: "Viac", href: "/more", Icon: MoreHorizontal },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f2e8]/95 pt-[54px] backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-7xl px-5 pb-4 pt-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-4">
              <Image
                src="/logo.png"
                alt="DOKAN Bratislava"
                width={64}
                height={64}
                className="rounded-full object-cover shadow-sm"
                priority
              />

              <div className="min-w-0">
                <p className="truncate text-[24px] font-extrabold leading-tight tracking-[-0.04em] text-[#111]">
                  DOKAN{" "}
                  <span className="text-[#d71920]">Trénerská zóna</span>
                </p>

                {email && (
                  <p className="mt-1 truncate text-sm text-black/45">
                    {email}
                  </p>
                )}
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
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 px-3 pb-safe pt-2 backdrop-blur shadow-[0_-6px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomMenu.map(({ label, href, Icon }) => {
            const active =
              pathname === href ||
              (href === "/dashboard" && pathname === "/") ||
              (href !== "/dashboard" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
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
"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Home,
  LogOut,
  Mail,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  Tags,
  Trophy,
  Users,
  Bell,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  Icon: LucideIcon;
  adminOnly?: boolean;
};

export default function Header({ email }: { email?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { permissions, loading, mounted } = usePermissions();

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [substitutionCount, setSubstitutionCount] = useState(0);
  const [latestChatHref, setLatestChatHref] = useState("/chat");

  const isAdmin = !!permissions?.can_manage_trainers;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allMenu: MenuItem[] = [
    { key: "dashboard", label: "Domov", href: "/dashboard", Icon: Home },
    { key: "dojo", label: "Dojo", href: "/dojos", Icon: Building2 },
    { key: "students", label: "Žiaci", href: "/students", Icon: Users },
    { key: "trainers", label: "Tréneri", href: "/trainers", Icon: Users, adminOnly: true },
    { key: "topics", label: "Témy", href: "/topics", Icon: Tags },
    { key: "trainings", label: "Tréningy", href: "/trainings", Icon: CalendarCheck },
    { key: "events", label: "Semináre", href: "/events", Icon: Trophy },
    { key: "stats", label: "Štatistiky", href: "/stats", Icon: BarChart3 },
    { key: "emails", label: "Emaily", href: "/emails", Icon: Mail },
    { key: "chat", label: "Chat", href: "/chat", Icon: MessageCircle },
    { key: "notes", label: "Poznámky", href: "/notes", Icon: NotebookPen },
    { key: "more", label: "Viac", href: "/more", Icon: MoreHorizontal },
  ];

  const visibleMenu: string[] = Array.isArray(permissions?.visible_menu)
    ? permissions.visible_menu
    : [];

  const menu =
    !mounted || loading
      ? []
      : isAdmin
      ? allMenu
      : allMenu.filter((item) => {
          if (item.adminOnly) return false;
          return visibleMenu.includes(item.key);
        });

  async function loadSubstitutions() {
    const supabase = createClient();

    const { data } = await supabase
      .from("substitutions")
      .select("id")
      .eq("status", "open");

    setSubstitutionCount(data?.length || 0);
  }

  async function loadUnreadChatCount() {
    if (!permissions?.id) return;

    const supabase = createClient();

    const { data } = await supabase
      .from("trainer_chat_messages")
      .select("*");

    const unread = (data || []).filter((m: any) => {
      const readBy: string[] = m.read_by || [];
      return !readBy.includes(permissions.id) && m.trainer_id !== permissions.id;
    });

    setUnreadChatCount(unread.length);
  }

  useEffect(() => {
    loadUnreadChatCount();
    loadSubstitutions();

    const supabase = createClient();

    const channel = supabase
      .channel("live-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "substitutions" }, loadSubstitutions)
      .on("postgres_changes", { event: "*", schema: "public", table: "trainer_chat_messages" }, loadUnreadChatCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissions?.id]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#f7f2e8]/95 backdrop-blur border-b">
        <div className="px-5 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="logo" width={50} height={50} className="rounded-full" />
            <div>
              <p className="font-black text-lg">
                DOKAN <span className="text-[#d71920]">Trénerská zóna</span>
              </p>
              {email && <p className="text-xs text-black/40">{email}</p>}
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {substitutionCount > 0 && (
              <Link href="/substitutions" className="relative">
                <Bell className="text-purple-600" />
                <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-1 rounded-full">
                  {substitutionCount}
                </span>
              </Link>
            )}

            <button onClick={logout} className="bg-black text-white px-3 py-2 rounded-xl">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {menu.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
          <div className="grid grid-cols-6">
            {menu.map(({ key, href, Icon }) => (
              <Link key={key} href={href} className="flex flex-col items-center py-2 text-xs">
                <Icon size={20} />
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

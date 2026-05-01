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
  const [latestChatHref, setLatestChatHref] = useState("/chat");

  const isAdmin = !!permissions?.can_manage_trainers;
  const notificationsEnabled = permissions?.chat_notifications_enabled !== false;

  const showTopChatBanner =
    unreadChatCount > 0 && notificationsEnabled && pathname !== "/chat";

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
      ? [{ key: "more", label: "Viac", href: "/more", Icon: MoreHorizontal }]
      : isAdmin
      ? allMenu
      : allMenu.filter((item) => {
          if (item.adminOnly) return false;
          if (item.key === "more") return true;
          return visibleMenu.includes(item.key);
        });

  const safeMenu =
    menu.length > 0
      ? menu
      : [{ key: "more", label: "Viac", href: "/more", Icon: MoreHorizontal }];

  const chatIsVisibleInBottom = useMemo(() => {
    return safeMenu.some((item) => item.key === "chat");
  }, [safeMenu]);

  async function loadUnreadChatCount() {
    if (!permissions?.id || !notificationsEnabled) {
      setUnreadChatCount(0);
      setLatestChatHref("/chat");
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainer_chat_messages")
      .select("id, trainer_id, recipient_trainer_id, room, read_by, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error.message);
      return;
    }

    const unread = (data || []).filter((m: any) => {
      const me = permissions.id;

      if (m.trainer_id === me) return false;

      const readBy: string[] = Array.isArray(m.read_by) ? m.read_by : [];
      if (readBy.includes(me)) return false;

      if (m.room === "all") return true;
      if (m.room === "direct" && m.recipient_trainer_id === me) return true;

      return false;
    });

    setUnreadChatCount(unread.length);

    const newest = unread[0];

    if (!newest) {
      setLatestChatHref("/chat");
      return;
    }

    if (newest.room === "direct") {
      setLatestChatHref(`/chat?trainer=${newest.trainer_id}`);
    } else {
      setLatestChatHref("/chat?trainer=all");
    }
  }

  useEffect(() => {
    loadUnreadChatCount();

    if (!permissions?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel("trainer-chat-header")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainer_chat_messages",
        },
        () => loadUnreadChatCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissions?.id, notificationsEnabled, pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f2e8]/95 pt-safe backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 pb-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <Image
                src="/logo.png"
                alt="DOKAN Bratislava"
                width={52}
                height={52}
                className="shrink-0 rounded-full object-cover"
                priority
              />

              <div className="min-w-0 leading-tight">
                <p className="truncate text-[20px] font-extrabold tracking-[-0.02em] text-[#111]">
                  DOKAN <span className="text-[#d71920]">Trénerská zóna</span>
                </p>

                {email && <p className="truncate text-xs text-black/45">{email}</p>}
              </div>
            </Link>

            <button
              onClick={logout}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white active:scale-[0.97]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Odhlásiť</span>
            </button>
          </div>

          {showTopChatBanner && (
            <Link
              href={latestChatHref}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#d71920] px-4 py-3 text-white shadow-[0_8px_20px_rgba(215,25,32,0.25)] active:scale-[0.98]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <MessageCircle size={22} />
                </div>

                <div className="min-w-0">
                  <p className="font-black">
                    Máš {unreadChatCount === 1 ? "novú správu" : "nové správy"}
                  </p>
                  <p className="truncate text-xs text-white/75">
                    Otvoriť chat, kde prišla správa
                  </p>
                </div>
              </div>

              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-sm font-black text-[#d71920]">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            </Link>
          )}
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 px-3 pb-safe pt-2 backdrop-blur">
        <div className="mx-auto max-w-7xl overflow-x-auto">
          <div
            className="grid min-w-max gap-1"
            style={{
              gridTemplateColumns: `repeat(${safeMenu.length}, minmax(92px, 1fr))`,
            }}
          >
            {safeMenu.map(({ key, label, href, Icon }) => {
              const active =
                pathname === href ||
                (href === "/dashboard" && pathname === "/") ||
                (href !== "/dashboard" && pathname.startsWith(href));

              const showChatBadge =
                unreadChatCount > 0 &&
                notificationsEnabled &&
                (key === "chat" || (key === "more" && !chatIsVisibleInBottom));

              const finalHref = key === "chat" ? latestChatHref : href;

              return (
                <Link
                  key={key}
                  href={finalHref}
                  className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition active:scale-[0.96] ${
                    active ? "bg-[#111] text-white" : "text-black/55"
                  }`}
                >
                  {showChatBadge && (
                    <span className="absolute right-4 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d71920] px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white">
                      {unreadChatCount > 9 ? "9+" : unreadChatCount}
                    </span>
                  )}

                  <Icon size={20} />
                  <span className="mt-1 whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
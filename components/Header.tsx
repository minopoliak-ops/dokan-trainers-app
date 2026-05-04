"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck,
  Handshake,
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
  const [openSubstitutionCount, setOpenSubstitutionCount] = useState(0);
  const [acceptedMySubstitutionCount, setAcceptedMySubstitutionCount] = useState(0);

  const isAdmin = !!permissions?.can_manage_trainers;
  const notificationsEnabled = permissions?.chat_notifications_enabled !== false;
  const substitutionCount = openSubstitutionCount + acceptedMySubstitutionCount;

  const showTopChatBanner =
    unreadChatCount > 0 && notificationsEnabled && pathname !== "/chat";

  const showTopSubstitutionBanner =
    substitutionCount > 0 && pathname !== "/substitutions";

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

  const safeMenu = menu;

  const chatIsVisibleInBottom = useMemo(() => {
    return safeMenu.some((item) => item.key === "chat");
  }, [safeMenu]);

  const moreIsVisibleInBottom = useMemo(() => {
    return safeMenu.some((item) => item.key === "more");
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
      console.error("Header chat notification:", error.message);
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

    setLatestChatHref(
      newest.room === "direct"
        ? `/chat?trainer=${newest.trainer_id}`
        : "/chat?trainer=all"
    );
  }

  async function loadSubstitutionCount() {
    if (!permissions?.id) {
      setOpenSubstitutionCount(0);
      setAcceptedMySubstitutionCount(0);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("training_substitution_requests")
      .select("id, requester_id, substitute_id, status, request_date, end_date, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("Header substitution notification:", error.message);
      setOpenSubstitutionCount(0);
      setAcceptedMySubstitutionCount(0);
      return;
    }

    const todayValue = new Date().toISOString().slice(0, 10);
    const rows = data || [];

    const open = rows.filter((r: any) => r.status === "open").length;

    const acceptedMine = rows.filter((r: any) => {
      if (r.status !== "accepted") return false;

      const isRequester = r.requester_id === permissions.id;
      const isSubstitute = r.substitute_id === permissions.id;

      if (!isRequester && !isSubstitute) return false;

      const end = r.end_date || r.request_date;
      if (!end) return true;

      return todayValue <= end;
    }).length;

    setOpenSubstitutionCount(open);
    setAcceptedMySubstitutionCount(acceptedMine);
  }

  async function loadNotifications() {
    await Promise.all([loadUnreadChatCount(), loadSubstitutionCount()]);
  }

  useEffect(() => {
    loadNotifications();

    if (!permissions?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`header-live-${permissions.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainer_chat_messages",
        },
        () => loadUnreadChatCount()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_substitution_requests",
        },
        () => loadSubstitutionCount()
      )
      .subscribe();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(interval);
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

            <div className="flex shrink-0 items-center gap-2">
              {substitutionCount > 0 && (
                <Link
                  href="/substitutions"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.25)] active:scale-[0.97]"
                  title="Zastupovanie"
                >
                  <Handshake size={20} />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black shadow-md ring-2 ring-white">
                    {substitutionCount > 9 ? "9+" : substitutionCount}
                  </span>
                </Link>
              )}

              {unreadChatCount > 0 && notificationsEnabled && (
                <Link
                  href={latestChatHref}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.97]"
                  title="Chat"
                >
                  <MessageCircle size={20} />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-[#d71920] shadow-md ring-2 ring-white">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                </Link>
              )}

              <button
                onClick={logout}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white active:scale-[0.97]"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Odhlásiť</span>
              </button>
            </div>
          </div>

          {showTopSubstitutionBanner && (
            <Link
              href="/substitutions"
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-indigo-600 px-4 py-3 text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] active:scale-[0.98]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <BellRing size={22} />
                </div>

                <div className="min-w-0">
                  <p className="font-black">
                    {acceptedMySubstitutionCount > 0
                      ? "Záskok bol potvrdený"
                      : "Treba zastúpiť tréning"}
                  </p>
                  <p className="truncate text-xs text-white/75">
                    Otvoriť zastupovanie a prezenčku
                  </p>
                </div>
              </div>

              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-sm font-black text-black">
                {substitutionCount > 9 ? "9+" : substitutionCount}
              </span>
            </Link>
          )}

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

      {safeMenu.length > 0 && (
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

                const showSubstitutionBadge =
                  substitutionCount > 0 &&
                  ((key === "more" && moreIsVisibleInBottom) || key === "substitutions");

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

                    {showSubstitutionBadge && (
                      <span className="absolute left-4 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black shadow-md ring-2 ring-white">
                        {substitutionCount > 9 ? "9+" : substitutionCount}
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
      )}
    </>
  );
}

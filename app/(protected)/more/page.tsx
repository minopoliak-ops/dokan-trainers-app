"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  BellRing,
  CalendarDays,
  Globe,
  GraduationCap,
  Handshake,
  Mail,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const items = [
  {
    title: "Technické stupne",
    subtitle: "Syllabus, techniky a checklist tréningu",
    href: "/more/technical-grade",
    Icon: GraduationCap,
    badge: "Nové",
  },
  {
    title: "Zastupovanie tréningov",
    subtitle: "Žiadosti o záskok, témy tréningu a prezenčka",
    href: "/substitutions",
    Icon: Handshake,
    badge: "Záskok",
    substitution: true,
  },
  {
    title: "Kohai prístupy",
    subtitle: "Pomocníci, dojo a povolenia",
    href: "/kohai",
    Icon: ShieldCheck,
    badge: "Admin",
  },
  {
    title: "Kalendár akcií",
    subtitle: "Semináre, tábory a klubové akcie",
    href: "https://dokanbratislava.sk",
    Icon: CalendarDays,
    external: true,
    badge: "Web",
  },
  {
    title: "Web DOKAN Bratislava",
    subtitle: "Oficiálna stránka klubu a informácie pre verejnosť",
    href: "https://dokanbratislava.sk",
    Icon: Globe,
    external: true,
    badge: "Online",
  },
];

export default function MorePage() {
  const [openSubstitutions, setOpenSubstitutions] = useState(0);
  const [trainerEmails, setTrainerEmails] = useState<string[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  async function loadNotifications() {
    setLoadingNotifications(true);
    const supabase = createClient();

    const [substitutionRes, trainersRes] = await Promise.all([
      supabase
        .from("training_substitution_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("trainers")
        .select("email")
        .eq("active", true)
        .not("email", "is", null),
    ]);

    if (!substitutionRes.error) setOpenSubstitutions(substitutionRes.count || 0);

    if (!trainersRes.error) {
      setTrainerEmails(
        (trainersRes.data || [])
          .map((trainer: any) => String(trainer.email || "").trim())
          .filter(Boolean)
      );
    }

    setLoadingNotifications(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const trainerMailto = useMemo(() => {
    const emails = trainerEmails.join(",");
    const subject = "DOKAN - prosba o zastupovanie tréningu";
    const appUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/substitutions`
        : "https://app.dokanbratislava.online/substitutions";

    const body = `Ahojte,

v aplikácii DOKAN Trénerská zóna je otvorená žiadosť o zastupovanie tréningu.

Prosím otvorte aplikáciu a potvrďte, kto vie tréning prevziať:
${appUrl}

Ďakujem.`;

    return `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [trainerEmails]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Sparkles size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Trénerské centrum
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">Viac</h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Rýchle nástroje pre trénerov, kohai, technické stupne,
            zastupovanie, web a kalendár.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Sekcie</p>
              <p className="text-3xl font-black">5</p>
            </div>

            <div
              className={`rounded-2xl p-4 transition ${
                openSubstitutions > 0
                  ? "bg-[#d71920] text-white shadow-[0_10px_25px_rgba(215,25,32,0.25)]"
                  : "bg-white/10"
              }`}
            >
              <p
                className={
                  openSubstitutions > 0
                    ? "text-sm text-white/80"
                    : "text-sm text-white/50"
                }
              >
                Treba zastúpiť
              </p>
              <p className="text-3xl font-black">
                {loadingNotifications ? "..." : openSubstitutions}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prístup</p>
              <p className="text-3xl font-black">1 klik</p>
            </div>
          </div>
        </div>
      </div>

      {openSubstitutions > 0 && (
        <div className="rounded-[30px] bg-[#d71920] p-5 text-white shadow-[0_14px_30px_rgba(215,25,32,0.28)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <BellRing size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-white/65">
                Notifikácia
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Treba zastúpiť tréning
              </h2>

              <p className="mt-1 font-semibold text-white/80">
                Aktuálne je otvorených {openSubstitutions} žiadostí o záskok.
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <Link
                  href="/substitutions"
                  className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-[#d71920] active:scale-[0.98]"
                >
                  <Handshake size={18} />
                  Otvoriť zastupovanie
                </Link>

                <a
                  href={trainerMailto}
                  className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
                >
                  <Send size={18} />
                  Poslať email trénerom
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Dostupné nástroje
            </p>
            <h2 className="text-2xl font-black">Menu</h2>
          </div>

          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
          >
            <RefreshCcw size={17} />
            Obnoviť
          </button>
        </div>

        <div className="grid gap-3">
          {items.map(
            ({ title, subtitle, href, Icon, external, badge, substitution }, index) => {
              const hasSubstitutionBadge = !!substitution && openSubstitutions > 0;
              const isPrimary =
                index === 0 ||
                title.includes("Kohai") ||
                title.includes("Zastupovanie");

              const className = `group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-[26px] p-4 ring-1 transition active:scale-[0.98] ${
                isPrimary
                  ? "bg-white ring-[#d71920]/20 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                  : "bg-[#f7f2e8] ring-black/5"
              } ${hasSubstitutionBadge ? "ring-red-200" : ""}`;

              const content = (
                <>
                  {hasSubstitutionBadge && (
                    <div className="absolute right-3 top-3 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#d71920] px-2 text-sm font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)]">
                      {openSubstitutions}
                    </div>
                  )}

                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${
                      isPrimary ? "bg-[#d71920]" : "bg-[#111]"
                    }`}
                  >
                    <Icon size={26} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-xl font-black text-[#111]">
                        {title}
                      </h2>

                      {badge && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            hasSubstitutionBadge
                              ? "bg-red-100 text-red-800"
                              : "bg-[#d71920]/10 text-[#d71920]"
                          }`}
                        >
                          {hasSubstitutionBadge
                            ? `${openSubstitutions} nové`
                            : badge}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-words text-sm font-semibold text-black/55">
                      {subtitle}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black ${
                      isPrimary ? "bg-[#d71920] text-white" : "bg-white text-black"
                    }`}
                  >
                    ↗
                  </div>
                </>
              );

              if (external) {
                return (
                  <a
                    key={href + title}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link key={href} href={href} className={className}>
                  {content}
                </Link>
              );
            }
          )}
        </div>
      </div>

      <div className="rounded-[26px] bg-[#111] p-5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
          Tip
        </p>

        <p className="mt-2 text-lg font-black">
          Zastupovanie použi vtedy, keď tréner chýba. Po potvrdení záskoku
          sa zastupujúcemu trénerovi otvorí prezenčka na daný deň.
        </p>

        {trainerEmails.length > 0 && (
          <a
            href={trainerMailto}
            className="mt-4 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-[#111] active:scale-[0.98] md:w-auto"
          >
            <Mail size={18} />
            Email všetkým trénerom
          </a>
        )}
      </div>
    </div>
  );
}

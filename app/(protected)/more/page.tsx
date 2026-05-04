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
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const items = [
  {
    title: "Technické stupne",
    subtitle: "Techniky podľa pásov, kyu a dan stupňov",
    href: "/more/technical-grade",
    Icon: GraduationCap,
    tag: "Nové",
    primary: true,
  },
  {
    title: "Zastupovanie tréningov",
    subtitle: "Žiadosti o záskok, témy tréningu a prezenčka",
    href: "/substitutions",
    Icon: Handshake,
    tag: "Záskok",
    substitution: true,
    primary: true,
  },
  {
    title: "Kalendár akcií",
    subtitle: "Semináre, tábory a klubové akcie",
    href: "https://dokanbratislava.sk",
    Icon: CalendarDays,
    external: true,
    tag: "Web",
  },
  {
    title: "Web DOKAN Bratislava",
    subtitle: "Oficiálna stránka klubu a informácie pre verejnosť",
    href: "https://dokanbratislava.sk",
    Icon: Globe,
    external: true,
    tag: "Online",
  },
];

export default function MorePage() {
  const [openSubstitutions, setOpenSubstitutions] = useState(0);
  const [trainerEmails, setTrainerEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    setLoading(true);
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

    if (!substitutionRes.error) {
      setOpenSubstitutions(substitutionRes.count || 0);
    }

    if (!trainersRes.error) {
      setTrainerEmails(
        (trainersRes.data || [])
          .map((t: any) => String(t.email || "").trim())
          .filter(Boolean)
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const trainerMailto = useMemo(() => {
    const emails = trainerEmails.join(",");
    const subject = "DOKAN - prosba o zastupovanie tréningu";
    const body = `Ahojte,

v aplikácii DOKAN Trénerská zóna je otvorená žiadosť o zastupovanie tréningu.

Prosím otvorte aplikáciu a potvrďte, kto vie tréning prevziať:
${typeof window !== "undefined" ? `${window.location.origin}/substitutions` : "https://app.dokanbratislava.online/substitutions"}

Ďakujem.`;

    return `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [trainerEmails]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[34px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Sparkles size={28} />
          </div>

          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
            Trénerské centrum
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">Viac</h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Rýchly prístup k technickým stupňom, zastupovaniu, webu a kalendáru.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Nová sekcia</p>
              <p className="text-3xl font-black">Techniky</p>
            </div>

            <div
              className={`rounded-2xl p-4 ${
                openSubstitutions > 0
                  ? "bg-[#d71920] text-white shadow-[0_10px_25px_rgba(215,25,32,0.25)]"
                  : "bg-white/10"
              }`}
            >
              <p className={openSubstitutions > 0 ? "text-sm text-white/80" : "text-sm text-white/50"}>
                Zastupovanie
              </p>
              <p className="text-3xl font-black">
                {loading ? "..." : openSubstitutions}
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

      <div className="rounded-[32px] bg-white p-4 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">
              Menu
            </p>
            <h2 className="text-2xl font-black">Dostupné nástroje</h2>
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
          {items.map(({ title, subtitle, href, Icon, external, tag, primary, substitution }) => {
            const hasBadge = substitution && openSubstitutions > 0;

            const className = `group relative flex items-center gap-4 overflow-hidden rounded-[26px] p-5 ring-1 active:scale-[0.98] ${
              primary
                ? "bg-[#f7f2e8] ring-black/5 shadow-sm"
                : "bg-[#f7f2e8] ring-black/5"
            } ${hasBadge ? "ring-red-200" : ""}`;

            const iconClass = `flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              hasBadge || primary ? "bg-[#d71920] text-white" : "bg-[#111] text-white"
            }`;

            const content = (
              <>
                {hasBadge && (
                  <div className="absolute right-4 top-4 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#d71920] px-2 text-sm font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)]">
                    {openSubstitutions}
                  </div>
                )}

                <div className={iconClass}>
                  <Icon size={26} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-black text-[#111]">
                      {title}
                    </h2>

                    {tag && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          hasBadge
                            ? "bg-red-100 text-red-800"
                            : "bg-black/5 text-black/55"
                        }`}
                      >
                        {hasBadge ? `${openSubstitutions} nové` : tag}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 break-words text-sm font-semibold text-black/55">
                    {subtitle}
                  </p>
                </div>

                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow-sm md:flex">
                  →
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
          })}
        </div>
      </div>

      <div className="rounded-[28px] bg-[#111] p-5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
          Tip
        </p>
        <p className="mt-2 text-lg font-black">
          Zastupovanie si vieš použiť ako rýchlu nástenku: tréner požiada,
          ostatní potvrdia a následne sa im otvorí prezenčka na daný deň.
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

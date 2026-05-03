import {
  ArrowUpRight,
  CalendarDays,
  Globe,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Technické stupne",
    subtitle: "Techniky podľa pásov, kyu a dan stupňov",
    href: "/more/technical-grades",
    Icon: GraduationCap,
    badge: "Nové",
    external: false,
    featured: true,
  },
  {
    title: "Kalendár akcií",
    subtitle: "Semináre, tábory a klubové akcie",
    href: "https://dokanbratislava.sk",
    Icon: CalendarDays,
    badge: "Web",
    external: true,
    featured: false,
  },
  {
    title: "Web DOKAN Bratislava",
    subtitle: "Oficiálna stránka klubu a informácie pre verejnosť",
    href: "https://dokanbratislava.sk",
    Icon: Globe,
    badge: "Online",
    external: true,
    featured: false,
  },
];

export default function MorePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="overflow-hidden rounded-[34px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#d71920]/25 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#d71920] shadow-[0_10px_25px_rgba(215,25,32,0.35)]">
                <Sparkles size={30} />
              </div>

              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
                Trénerské centrum
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Viac
              </h1>

              <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-white/65">
                Rýchly prístup ku kalendáru, webu a technickým stupňom pre trénerov.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-sm text-white/45">Moduly</p>
                  <p className="mt-1 text-3xl font-black">{items.length}</p>
                </div>

                <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-sm text-white/45">Nová sekcia</p>
                  <p className="mt-1 text-xl font-black">Techniky</p>
                </div>

                <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-sm text-white/45">Prístup</p>
                  <p className="mt-1 text-xl font-black">1 klik</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">
              Menu
            </p>
            <h2 className="text-2xl font-black text-[#111]">Dostupné nástroje</h2>
          </div>

          <div className="grid gap-4">
            {items.map(({ title, subtitle, href, Icon, external, badge, featured }) => {
              const content = (
                <>
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-white shadow-sm ${
                      featured ? "bg-[#d71920]" : "bg-[#111]"
                    }`}
                  >
                    <Icon size={29} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-xl font-black text-[#111]">
                        {title}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          featured
                            ? "bg-[#d71920]/10 text-[#d71920]"
                            : "bg-black/5 text-black/55"
                        }`}
                      >
                        {badge}
                      </span>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed text-black/55">
                      {subtitle}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      featured
                        ? "bg-[#d71920] text-white"
                        : "bg-[#f7f2e8] text-black"
                    }`}
                  >
                    <ArrowUpRight size={20} />
                  </div>
                </>
              );

              const className = `group flex min-w-0 items-center gap-4 rounded-[28px] p-4 transition active:scale-[0.98] sm:p-5 ${
                featured
                  ? "bg-[#fff5f5] ring-1 ring-[#d71920]/20 shadow-[0_10px_28px_rgba(215,25,32,0.10)]"
                  : "bg-[#f7f2e8] ring-1 ring-black/5 hover:bg-white"
              }`;

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

        <div className="rounded-[30px] bg-[#111] p-5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-white/40">
            Tip
          </p>
          <p className="mt-2 text-lg font-bold leading-relaxed text-white/80">
            Technické stupne si vieš použiť ako tréningový checklist: vyber stupeň,
            otvor sekciu a označ odcvičené techniky.
          </p>
        </div>
      </div>
    </div>
  );
}

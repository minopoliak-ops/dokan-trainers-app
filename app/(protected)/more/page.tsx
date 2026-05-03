import {
  CalendarDays,
  Globe,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Technické stupne",
    subtitle: "Syllabus, techniky a checklist tréningu",
    href: "/more/technical-grade",
    Icon: GraduationCap,
    badge: "Nové",
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
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Sparkles size={28} />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">Trénerské centrum</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Viac</h1>
          <p className="mt-3 max-w-2xl text-white/65">Rýchle nástroje pre trénerov, kohai, technické stupne, web a kalendár.</p>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-black/35">Dostupné nástroje</p>
        <div className="grid gap-3">
          {items.map(({ title, subtitle, href, Icon, external, badge }, index) => {
            const isPrimary = index === 0 || title.includes("Kohai");
            const className = `group flex min-w-0 items-center gap-4 rounded-[26px] p-4 ring-1 transition active:scale-[0.98] ${isPrimary ? "bg-white ring-[#d71920]/20 shadow-[0_8px_20px_rgba(0,0,0,0.06)]" : "bg-[#f7f2e8] ring-black/5"}`;
            const content = <><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${isPrimary ? "bg-[#d71920]" : "bg-[#111]"}`}><Icon size={26} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-black text-[#111]">{title}</h2>{badge && <span className="rounded-full bg-[#d71920]/10 px-3 py-1 text-xs font-black text-[#d71920]">{badge}</span>}</div><p className="mt-1 break-words text-sm font-semibold text-black/55">{subtitle}</p></div><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black ${isPrimary ? "bg-[#d71920] text-white" : "bg-white text-black"}`}>↗</div></>;
            if (external) return <a key={href + title} href={href} target="_blank" rel="noreferrer" className={className}>{content}</a>;
            return <Link key={href} href={href} className={className}>{content}</Link>;
          })}
        </div>
      </div>

      <div className="rounded-[26px] bg-[#111] p-5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Tip</p>
        <p className="mt-2 text-lg font-black">Kohai prístup použi vtedy, keď tréner chýba a pomocník má zapísať prezenčku alebo pridať nového člena.</p>
      </div>
    </div>
  );
}

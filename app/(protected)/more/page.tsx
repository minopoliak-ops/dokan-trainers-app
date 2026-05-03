import {
  CalendarDays,
  Globe,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Kalendár akcií",
    subtitle: "Preklik na kalendár seminárov a akcií",
    href: "https://dokanbratislava.sk",
    Icon: CalendarDays,
    external: true,
  },
  {
    title: "Web DOKAN Bratislava",
    subtitle: "Oficiálna WordPress stránka",
    href: "https://dokanbratislava.sk",
    Icon: Globe,
    external: true,
  },
  {
    title: "Technické stupne",
    subtitle: "Prehľad techník podľa pásov / kyu / dan",
    href: "/more/technical-grades",
    Icon: GraduationCap,
  },
];

export default function MorePage() {
  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">

      <div className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">Trénerské centrum</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Viac</h1>
        <p className="mt-2 text-sm text-white/70">
          Dôležité odkazy a technické stupne.
        </p>
      </div>

      <div className="grid gap-4">
        {items.map(({ title, subtitle, href, Icon, external }) => {
          const className =
            "flex items-center gap-4 rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]";

          const content = (
            <>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d71920] text-white">
                <Icon size={26} />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-extrabold text-[#111]">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-black/55">
                  {subtitle}
                </p>
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
  );
}

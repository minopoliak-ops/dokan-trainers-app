import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Mail,
} from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Témy",
    subtitle: "Tréningové témy a techniky",
    href: "/topics",
    Icon: BookOpen,
  },
  {
    title: "Semináre",
    subtitle: "Akcie, semináre a tábory",
    href: "/events",
    Icon: CalendarDays,
  },
  {
    title: "Štatistiky",
    subtitle: "Prehľady a dochádzka",
    href: "/stats",
    Icon: BarChart3,
  },
  {
    title: "Emaily",
    subtitle: "Emailové šablóny a správy",
    href: "/emails",
    Icon: Mail,
  },
];

export default function MorePage() {
  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">Menu</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Viac</h1>
        <p className="mt-2 text-sm text-white/70">
          Ďalšie časti aplikácie.
        </p>
      </div>

      <div className="grid gap-4">
        {items.map(({ title, subtitle, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920] text-white">
              <Icon size={26} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#111]">{title}</h2>
              <p className="mt-1 text-sm text-black/55">{subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
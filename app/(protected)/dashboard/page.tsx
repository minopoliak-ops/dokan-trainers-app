"use client";

import { createClient } from "@/lib/supabase/browser";
import { Building2, CalendarCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [dojos, setDojos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("dojos")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDojos(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen space-y-6 bg-[#f7f2e8] px-5 py-6 pb-28">
      <div className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">DOKAN Bratislava</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Moje dojo
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Vyber telocvičňu a pokračuj
        </p>
      </div>

      {loading && (
        <div className="grid gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-3xl bg-white/60"
            />
          ))}
        </div>
      )}

      {!loading && dojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš priradené žiadne dojo.
        </div>
      )}

      <div className="grid gap-5">
        {dojos.map((dojo, i) => (
          <Link
            key={dojo.id}
            href={`/dojos/${dojo.id}`}
            className="group rounded-[26px] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
            style={{
              animation: "fadeUp 0.4s ease forwards",
              animationDelay: `${i * 0.05}s`,
              opacity: 0,
            }}
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
              <Building2 size={26} />
            </div>

            <h2 className="text-xl font-bold text-[#111]">{dojo.name}</h2>

            <p className="mt-1 text-sm text-black/60">{dojo.address}</p>

            <div className="mt-5 flex gap-4 text-sm font-semibold text-black/70">
              <span className="inline-flex items-center gap-1">
                <Users size={16} /> Žiaci
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarCheck size={16} /> Prezenčka
              </span>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
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
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">DOKAN Bratislava</p>
        <h1 className="text-3xl font-bold">Moje dojo</h1>
        <p className="mt-2 text-white/70">
          Vyber telocvičňu a otvor žiakov, prezenčky alebo štatistiky.
        </p>
      </div>

      {loading && <p>Načítavam...</p>}

      {!loading && dojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš priradené žiadne dojo.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {dojos.map((dojo) => (
          <Link
            key={dojo.id}
            href={`/dojos/${dojo.id}`}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-red text-white">
              <Building2 size={28} />
            </div>

            <h2 className="text-2xl font-bold">{dojo.name}</h2>
            <p className="mt-1 text-black/60">{dojo.address}</p>

            <div className="mt-6 flex gap-4 text-sm font-semibold text-black/70">
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
    </div>
  );
}

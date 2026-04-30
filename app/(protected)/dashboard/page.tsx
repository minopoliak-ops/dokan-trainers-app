"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { dojoIds, loading: permissionsLoading } = usePermissions();
  const [dojos, setDojos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDojos() {
      if (permissionsLoading) return;

      if (!dojoIds || dojoIds.length === 0) {
        setDojos([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("dojos")
        .select("*")
        .in("id", dojoIds)
        .order("name");

      if (error) {
        console.error("Dashboard dojos error:", error);
        setDojos([]);
      } else {
        setDojos(data || []);
      }

      setLoading(false);
    }

    loadDojos();
  }, [dojoIds, permissionsLoading]);

  return (
    <div className="min-h-screen space-y-6 bg-[#f7f2e8] px-5 py-6 pb-40">
      <div className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">DOKAN Bratislava</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Moje dojo
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Vyber telocvičňu a pokračuj
        </p>
      </div>

      {(permissionsLoading || loading) && (
        <div className="grid gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      )}

      {!permissionsLoading && !loading && dojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš priradené žiadne dojo.
        </div>
      )}

      {!permissionsLoading && !loading && (
        <div className="grid gap-5">
          {dojos.map((dojo) => (
            <Link
              key={dojo.id}
              href={`/dojos/${dojo.id}`}
              className="rounded-[26px] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
                <Building2 size={26} />
              </div>

              <h2 className="text-xl font-bold text-[#111]">{dojo.name}</h2>
              <p className="mt-1 text-sm text-black/60">{dojo.address}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
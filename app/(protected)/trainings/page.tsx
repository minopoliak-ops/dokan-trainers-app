"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TrainingsPage() {
  const { permissions } = usePermissions();

  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!permissions?.can_manage_trainers;

  useEffect(() => {
    async function loadTrainings() {
      if (!permissions) return;

      const supabase = createClient();

      // 👑 ADMIN → všetko
      if (isAdmin) {
        const { data, error } = await supabase
          .from("trainings")
          .select("*, dojos(name), training_topics(name)")
          .order("training_date", { ascending: false });

        if (error) return alert(error.message);

        setTrainings(data || []);
        setLoading(false);
        return;
      }

      // 🥋 TRÉNER → len jeho dojo
      const { data, error } = await supabase
        .from("trainings")
        .select("*, dojos(name), training_topics(name)")
        .in(
          "dojo_id",
          (
            await supabase
              .from("trainer_dojos")
              .select("dojo_id")
              .eq("trainer_id", permissions.id)
          ).data?.map((d: any) => d.dojo_id) || []
        )
        .order("training_date", { ascending: false });

      if (error) return alert(error.message);

      setTrainings(data || []);
      setLoading(false);
    }

    loadTrainings();
  }, [permissions, isAdmin]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tréningy</h1>

        <p className="mt-2 text-white/70">
          {isAdmin
            ? "Prehľad všetkých tréningov vo všetkých dojo."
            : "Zobrazené sú len tréningy tvojich dojo."}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        {loading ? (
          <p className="text-black/60">Načítavam tréningy...</p>
        ) : trainings.length === 0 ? (
          <p>Žiadne tréningy pre tvoje dojo.</p>
        ) : (
          <div className="grid gap-3">
            {trainings.map((training) => (
              <Link
                key={training.id}
                href={`/dojos/${training.dojo_id}/attendance`}
                className="rounded-2xl border border-black/10 p-4 hover:bg-brand-cream active:scale-[0.98]"
              >
                <p className="text-lg font-bold">
                  {training.training_date} — {training.title}
                </p>

                <p className="text-black/60">
                  {training.dojos?.name || "Bez dojo"} ·{" "}
                  {training.training_topics?.name || "Bez témy"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
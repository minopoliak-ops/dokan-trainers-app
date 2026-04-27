"use client";

import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<any[]>([]);

  async function loadTrainings() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainings")
      .select("*, dojos(name), training_topics(name)")
      .order("training_date", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setTrainings(data || []);
  }

  useEffect(() => {
    loadTrainings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tréningy</h1>
        <p className="mt-2 text-white/70">
          Prehľad všetkých tréningov vo všetkých dojo.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        {trainings.length === 0 ? (
          <p>Zatiaľ nie sú zadané žiadne tréningy.</p>
        ) : (
          <div className="grid gap-3">
            {trainings.map((training) => (
              <Link
                key={training.id}
                href={`/dojos/${training.dojo_id}/attendance`}
                className="rounded-2xl border border-black/10 p-4 hover:bg-brand-cream"
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

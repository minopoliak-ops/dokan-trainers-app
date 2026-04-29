"use client";

import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DojoDetailPage({ params }: { params: { id: string } }) {
  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setDojo(data));

    supabase
      .from("students")
      .select("*")
      .eq("dojo_id", params.id)
      .eq("active", true)
      .order("last_name")
      .then(({ data }) => setStudents(data || []));
  }, [params.id]);

  function getContactPhone(student: any) {
    return student.is_adult ? student.phone : student.parent_phone;
  }

  function getContactLabel(student: any) {
    return student.is_adult ? "Kontakt cvičiaceho" : "Kontakt rodiča";
  }

  if (!dojo) return <p>Načítavam...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Detail dojo</p>
        <h1 className="text-3xl font-bold">{dojo.name}</h1>
        <p className="mt-2 text-white/70">{dojo.address}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/students/new?dojo=${params.id}`}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
        >
          <h2 className="text-xl font-bold">+ Pridať žiaka</h2>
          <p className="mt-2 text-black/60">Nový žiak do tohto dojo.</p>
        </Link>

        <Link
          href={`/dojos/${params.id}/attendance`}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
        >
          <h2 className="text-xl font-bold">Prezenčka</h2>
          <p className="mt-2 text-black/60">
            Mesiace, dátumy tréningov a dochádzka.
          </p>
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <h2 className="text-xl font-bold">Tréningy</h2>
          <p className="mt-2 text-black/60">Témy tréningov.</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Žiaci</h2>

        {students.length === 0 ? (
          <p>Zatiaľ tu nie sú žiadni žiaci.</p>
        ) : (
          <div className="grid gap-3">
            {students.map((student) => {
              const phone = getContactPhone(student);

              return (
                <div
                  key={student.id}
                  className="rounded-2xl border border-black/10 p-4 hover:bg-brand-cream"
                >
                  <Link href={`/students/${student.id}`} className="block">
                    <p className="text-lg font-bold">
                      {student.first_name} {student.last_name}
                    </p>

                    <p className="text-sm text-black/60">
                      {student.technical_grade || "Bez technického stupňa"}
                    </p>
                  </Link>

                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="mt-3 inline-flex rounded-xl bg-[#d71920] px-3 py-2 text-sm font-bold text-white"
                    >
                      📞 {getContactLabel(student)}: {phone}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
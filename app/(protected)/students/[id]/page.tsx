"use client";

import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("students")
      .select("*, dojos(name, address)")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error);
        setStudent(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <p>Načítavam profil žiaka...</p>;
  if (!student) return <p>Žiak sa nenašiel.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">{student.dojos?.name}</p>
        <h1 className="text-3xl font-bold">
          {student.first_name} {student.last_name}
        </h1>
        <p className="mt-2 text-white/70">
          {student.technical_grade || "Bez technického stupňa"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <h2 className="mb-4 text-xl font-bold">Základné údaje</h2>
          <p><b>Rok narodenia:</b> {student.birth_year || "-"}</p>
          <p><b>Dojo:</b> {student.dojos?.name || "-"}</p>
          <p><b>Technický stupeň:</b> {student.technical_grade || "-"}</p>
          <p><b>Dátum páskovania:</b> {student.last_grading_date || "-"}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <h2 className="mb-4 text-xl font-bold">Kontakt</h2>
          <p><b>Rodič:</b> {student.parent_name || "-"}</p>
          <p><b>Telefón:</b> {student.parent_phone || "-"}</p>
          <p><b>Email:</b> {student.parent_email || "-"}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Zdravotné poznámky</h2>
          <p>{student.health_info || "Bez poznámky."}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Lieky / poznámky</h2>
          <p>{student.medication_info || "Bez poznámky."}</p>
          <p className="mt-3 text-black/60">{student.notes || ""}</p>
        </div>
      </div>

      <Link
        href={`/dojos/${student.dojo_id}`}
        className="inline-block rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
      >
        Späť do dojo
      </Link>
    </div>
  );
}

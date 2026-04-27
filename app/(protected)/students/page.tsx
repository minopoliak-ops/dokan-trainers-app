"use client";

import { createClient } from "@/lib/supabase/browser";
import { Download, Upload, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("students").select("*, dojos(name)").eq("active", true).order("last_name").then(({ data }) => setStudents(data || []));
  }, []);

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Administrácia</p>
        <h1 className="text-3xl font-bold">Žiaci</h1>
        <p className="mt-2 text-white/70">Pridávanie, import, export a technické stupne.</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/students/new" className="rounded-3xl bg-white p-5 font-bold shadow-sm ring-1 ring-black/5"><UserPlus className="mb-3 text-brand-red" />Pridať žiaka</Link>
        <Link href="/students/import" className="rounded-3xl bg-white p-5 font-bold shadow-sm ring-1 ring-black/5"><Upload className="mb-3 text-brand-red" />Import CSV</Link>
        <Link href="/students/export" className="rounded-3xl bg-white p-5 font-bold shadow-sm ring-1 ring-black/5"><Download className="mb-3 text-brand-red" />Export CSV</Link>
      </div>

      <div className="grid gap-3">
        {students.map((student) => (
          <Link href={`/students/${student.id}`} key={student.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/5"><UserRound /></div>
              <div>
                <p className="font-bold">{student.first_name} {student.last_name}</p>
                <p className="text-sm text-black/50">{student.dojos?.name || "Bez dojo"} · {student.technical_grade || "Bez stupňa"}</p>
              </div>
            </div>
            <span className="text-black/30">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

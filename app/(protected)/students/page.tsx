"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Download, Upload, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentsPage() {
  const { permissions, dojoIds } = usePermissions();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      if (!permissions) return;

      const supabase = createClient();

      let query = supabase
        .from("students")
        .select("*, dojos(name)")
        .eq("active", true)
        .order("last_name");

      if (!permissions?.can_manage_trainers) {
        if (dojoIds.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        query = query.in("dojo_id", dojoIds);
      }

      const { data, error } = await query;

      if (error) console.error(error);
      setStudents(data || []);
      setLoading(false);
    }

    loadStudents();
  }, [permissions, dojoIds]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">Administrácia</p>
        <h1 className="mt-1 text-3xl font-extrabold">Žiaci</h1>
        <p className="mt-2 text-sm text-white/70">
          Pridávanie, import, export a technické stupne.
        </p>
      </div>

      <div className="grid gap-3">
        <Link href="/students/new" className="flex items-center gap-3 rounded-3xl bg-white p-5 font-bold shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]">
          <UserPlus className="text-[#d71920]" />
          Pridať žiaka
        </Link>

        {permissions?.can_manage_trainers && (
  <>
    <Link href="/students/import" className="flex items-center gap-3 rounded-3xl bg-white p-5 font-bold shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]">
      <Upload className="text-[#d71920]" />
      Import CSV
    </Link>

    <Link href="/students/export" className="flex items-center gap-3 rounded-3xl bg-white p-5 font-bold shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-[0.98]">
      <Download className="text-[#d71920]" />
      Export CSV
    </Link>
  </>
)}

      {loading && (
        <div className="rounded-3xl bg-white p-5 text-black/60 shadow-sm">
          Načítavam žiakov...
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="rounded-3xl bg-white p-5 text-center text-black/60 shadow-sm">
          Žiadni žiaci pre tvoje dojo.
        </div>
      )}

      <div className="grid gap-3">
        {students.map((student) => (
          <Link
            href={`/students/${student.id}`}
            key={student.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-[0_6px_14px_rgba(0,0,0,0.06)] ring-1 ring-black/5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/5">
                <UserRound />
              </div>

              <div>
                <p className="font-bold">
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-sm text-black/50">
                  {student.dojos?.name || "Bez dojo"} ·{" "}
                  {student.technical_grade || "Bez stupňa"}
                </p>
              </div>
            </div>

            <span className="text-black/30">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
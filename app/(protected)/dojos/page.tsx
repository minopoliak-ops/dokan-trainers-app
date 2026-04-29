"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DojoDetailPage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const isAdmin = !!permissions?.can_manage_trainers;
  const canAddStudents = !!permissions?.can_add_students || isAdmin;

  useEffect(() => {
    async function load() {
      if (!permissions) return;

      const supabase = createClient();

      if (!isAdmin) {
        const { data: link } = await supabase
          .from("trainer_dojos")
          .select("id")
          .eq("trainer_id", permissions.id)
          .eq("dojo_id", params.id)
          .maybeSingle();

        if (!link) {
          setAllowed(false);
          setLoading(false);
          return;
        }
      }

      setAllowed(true);

      const dojoRes = await supabase
        .from("dojos")
        .select("*")
        .eq("id", params.id)
        .single();

      const studentsRes = await supabase
        .from("students")
        .select("*")
        .eq("dojo_id", params.id)
        .eq("active", true)
        .order("last_name");

      setDojo(dojoRes.data);
      setStudents(studentsRes.data || []);
      setLoading(false);
    }

    load();
  }, [permissions, isAdmin, params.id]);

  if (loading) return <p>Načítavam...</p>;

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš oprávnenie vidieť toto dojo.
        </div>
      </div>
    );
  }

  if (!dojo) return <p>Dojo sa nenašlo.</p>;

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Detail dojo</p>
        <h1 className="text-3xl font-bold">{dojo.name}</h1>
        <p className="mt-2 text-white/70">{dojo.address}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {canAddStudents && (
          <Link
            href={`/students/new?dojo=${params.id}`}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
          >
            <h2 className="text-xl font-bold">+ Pridať žiaka</h2>
            <p className="mt-2 text-black/60">Nový žiak do tohto dojo.</p>
          </Link>
        )}

        <Link
          href={`/dojos/${params.id}/attendance`}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
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
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/students/${student.id}`}
                className="rounded-2xl border border-black/10 p-4 hover:bg-brand-cream active:scale-[0.98]"
              >
                <p className="text-lg font-bold">
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-sm text-black/60">
                  {student.technical_grade || "Bez technického stupňa"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
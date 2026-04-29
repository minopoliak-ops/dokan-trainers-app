"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AttendancePage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!permissions?.can_manage_trainers;
  const canWrite = !!permissions?.can_attendance || isAdmin;

  useEffect(() => {
    async function load() {
      if (!permissions) return;

      const supabase = createClient();

      // 🔐 CHECK PRÍSTUPU
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

      // 📥 LOAD DATA
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

      const trainingsRes = await supabase
        .from("trainings")
        .select("*")
        .eq("dojo_id", params.id)
        .order("training_date");

      const attendanceRes = await supabase.from("attendance").select("*");

      setDojo(dojoRes.data);
      setStudents(studentsRes.data || []);
      setTrainings(trainingsRes.data || []);
      setAttendance(attendanceRes.data || []);

      setLoading(false);
    }

    load();
  }, [permissions, isAdmin, params.id]);

  function getStatus(trainingId: string, studentId: string) {
    return attendance.find(
      (a) => a.training_id === trainingId && a.student_id === studentId
    )?.status;
  }

  async function toggle(trainingId: string, studentId: string) {
    if (!canWrite) return;

    const supabase = createClient();
    const current = getStatus(trainingId, studentId);

    if (!current) {
      await supabase.from("attendance").upsert({
        training_id: trainingId,
        student_id: studentId,
        status: "present",
      });
    } else if (current === "present") {
      await supabase.from("attendance").upsert({
        training_id: trainingId,
        student_id: studentId,
        status: "absent",
      });
    } else {
      await supabase
        .from("attendance")
        .delete()
        .eq("training_id", trainingId)
        .eq("student_id", studentId);
    }

    // reload
    const { data } = await supabase.from("attendance").select("*");
    setAttendance(data || []);
  }

  if (loading) return <p>Načítavam...</p>;

  if (!allowed) {
    return (
      <div className="p-6">
        ❌ Nemáš prístup do tejto prezenčky
      </div>
    );
  }

  if (!dojo) return <p>Dojo nenájdené</p>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{dojo.name} — Prezenčka</h1>

      {trainings.length === 0 && <p>Žiadne tréningy</p>}

      <div className="overflow-x-auto">
        <table className="min-w-max border">
          <thead>
            <tr>
              <th className="p-2 border">Žiak</th>
              {trainings.map((t) => (
                <th key={t.id} className="p-2 border">
                  {t.training_date}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="p-2 border">
                  {s.first_name} {s.last_name}
                </td>

                {trainings.map((t) => {
                  const status = getStatus(t.id, s.id);

                  return (
                    <td key={t.id} className="p-2 border text-center">
                      <button
                        onClick={() => toggle(t.id, s.id)}
                        className={`w-10 h-10 rounded ${
                          status === "present"
                            ? "bg-green-500"
                            : status === "absent"
                            ? "bg-red-500"
                            : "bg-gray-300"
                        }`}
                      >
                        {status === "present" && <Check />}
                        {status === "absent" && <X />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href={`/dojos/${params.id}`} className="block mt-4 text-blue-500">
        ← späť
      </Link>
    </div>
  );
}
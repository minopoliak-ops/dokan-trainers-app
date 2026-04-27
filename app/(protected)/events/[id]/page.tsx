"use client";

import { usePermissions } from "@/lib/usePermissions";
import { createClient } from "@/lib/supabase/browser";
import { Check, X, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Status = "present" | "absent" | null;

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [event, setEvent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  async function loadData() {
    const supabase = createClient();

    const eventRes = await supabase
      .from("events")
      .select("*, dojos(name), trainers(full_name), training_topics(name)")
      .eq("id", params.id)
      .single();

    const studentsRes = await supabase
      .from("students")
      .select("*, dojos(name)")
      .eq("active", true)
      .order("last_name");

    const attendanceRes = await supabase
      .from("event_attendance")
      .select("*, students(first_name, last_name, technical_grade, dojos(name))")
      .eq("event_id", params.id);

    setEvent(eventRes.data);
    setStudents(studentsRes.data || []);
    setAttendance(attendanceRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addStudent() {
    if (!permissions?.can_attendance && !permissions?.can_manage_trainers) {
      alert("Nemáš oprávnenie zapisovať prezenčku.");
      return;
    }

    if (!selectedStudentId) return;

    const supabase = createClient();

    const { error } = await supabase.from("event_attendance").upsert(
      {
        event_id: params.id,
        student_id: selectedStudentId,
        status: "present",
      },
      { onConflict: "event_id,student_id" }
    );

    if (error) return alert(error.message);

    setSelectedStudentId("");
    loadData();
  }

  async function cycleStatus(row: any) {
    if (!permissions?.can_attendance && !permissions?.can_manage_trainers) {
      alert("Nemáš oprávnenie meniť prezenčku.");
      return;
    }

    const supabase = createClient();
    const current: Status = row.status || null;

    if (current === "present") {
      await supabase.from("event_attendance").update({ status: "absent" }).eq("id", row.id);
    }

    if (current === "absent") {
      await supabase.from("event_attendance").delete().eq("id", row.id);
    }

    if (!current) {
      await supabase.from("event_attendance").update({ status: "present" }).eq("id", row.id);
    }

    loadData();
  }

  async function removeStudent(rowId: string) {
    if (!permissions?.can_delete_students && !permissions?.can_manage_trainers) {
      alert("Nemáš oprávnenie odoberať cvičiacich.");
      return;
    }

    if (!confirm("Odstrániť cvičiaceho z prezenčky?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("event_attendance")
      .delete()
      .eq("id", rowId);

    if (error) return alert(error.message);

    loadData();
  }

  const alreadyAddedIds = attendance.map((a) => a.student_id);
  const availableStudents = students.filter((s) => !alreadyAddedIds.includes(s.id));

  const canWriteAttendance =
    permissions?.can_attendance || permissions?.can_manage_trainers;

  const canDelete =
    permissions?.can_delete_students || permissions?.can_manage_trainers;

  if (!event) return <p>Načítavam akciu...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Prezenčka akcie</p>
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="mt-2 text-white/70">
          {event.start_date}
          {event.end_date ? ` – ${event.end_date}` : ""} ·{" "}
          {event.dojos?.name || "Bez dojo"}
        </p>
        <p className="mt-1 text-white/70">
          Tréner: {event.trainers?.full_name || "-"} · Téma:{" "}
          {event.training_topics?.name || "Bez témy"}
        </p>
      </div>

      {canWriteAttendance && (
        <div className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:grid-cols-[1fr_auto]">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Vyber cvičiaceho</option>
            {availableStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.last_name} {student.first_name} — {student.dojos?.name}
              </option>
            ))}
          </select>

          <button
            onClick={addStudent}
            className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
          >
            + Pridať do prezenčky
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Účastníci</h2>

        {attendance.length === 0 ? (
          <p>Zatiaľ nie sú pridaní žiadni cvičiaci.</p>
        ) : (
          <div className="grid gap-3">
            {attendance.map((row) => {
              const status = row.status as Status;

              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl border border-black/10 p-4"
                >
                  <div>
                    <p className="text-lg font-bold">
                      {row.students?.first_name} {row.students?.last_name}
                    </p>
                    <p className="text-sm text-black/60">
                      {row.students?.technical_grade || "Bez stupňa"} ·{" "}
                      {row.students?.dojos?.name || ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {canWriteAttendance && (
                      <button
                        onClick={() => cycleStatus(row)}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
                          status === "present"
                            ? "bg-green-600"
                            : status === "absent"
                            ? "bg-red-600"
                            : "bg-black/20"
                        }`}
                      >
                        {status === "present" && <Check />}
                        {status === "absent" && <X />}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => removeStudent(row.id)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/10 hover:bg-red-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

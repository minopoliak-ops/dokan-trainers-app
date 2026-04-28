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
  const [external, setExternal] = useState<any[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [extFirst, setExtFirst] = useState("");
  const [extLast, setExtLast] = useState("");

  const canWriteAttendance =
    permissions?.can_attendance || permissions?.can_manage_trainers;

  const canDelete =
    permissions?.can_delete_students || permissions?.can_manage_trainers;

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

    const externalRes = await supabase
      .from("event_external_participants")
      .select("*")
      .eq("event_id", params.id)
      .order("created_at");

    setEvent(eventRes.data);
    setStudents(studentsRes.data || []);
    setAttendance(attendanceRes.data || []);
    setExternal(externalRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addStudent() {
    if (!canWriteAttendance) {
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
    if (!canWriteAttendance) {
      alert("Nemáš oprávnenie meniť prezenčku.");
      return;
    }

    const supabase = createClient();
    const current: Status = row.status || null;

    if (current === "present") {
      await supabase
        .from("event_attendance")
        .update({ status: "absent" })
        .eq("id", row.id);
    }

    if (current === "absent") {
      await supabase.from("event_attendance").delete().eq("id", row.id);
    }

    if (!current) {
      await supabase
        .from("event_attendance")
        .update({ status: "present" })
        .eq("id", row.id);
    }

    loadData();
  }

  async function removeStudent(rowId: string) {
    if (!canDelete) {
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

  async function addExternal() {
    if (!canWriteAttendance) {
      alert("Nemáš oprávnenie zapisovať prezenčku.");
      return;
    }

    if (!extFirst.trim() || !extLast.trim()) {
      alert("Vyplň meno a priezvisko.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("event_external_participants")
      .insert({
        event_id: params.id,
        first_name: extFirst.trim(),
        last_name: extLast.trim(),
        status: "present",
      });

    if (error) return alert(error.message);

    setExtFirst("");
    setExtLast("");
    loadData();
  }

  async function toggleExternal(row: any) {
    if (!canWriteAttendance) {
      alert("Nemáš oprávnenie meniť prezenčku.");
      return;
    }

    const supabase = createClient();
    const newStatus = row.status === "present" ? "absent" : "present";

    const { error } = await supabase
      .from("event_external_participants")
      .update({ status: newStatus })
      .eq("id", row.id);

    if (error) return alert(error.message);

    loadData();
  }

  async function deleteExternal(id: string) {
    if (!canDelete) {
      alert("Nemáš oprávnenie mazať účastníkov.");
      return;
    }

    if (!confirm("Vymazať externého účastníka?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("event_external_participants")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  const alreadyAddedIds = attendance.map((a) => a.student_id);
  const availableStudents = students.filter(
    (s) => !alreadyAddedIds.includes(s.id)
  );

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        Načítavam akciu...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">Prezenčka akcie</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {event.name}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {event.start_date}
          {event.end_date ? ` – ${event.end_date}` : ""} ·{" "}
          {event.dojos?.name || "Bez dojo"}
        </p>
        <p className="mt-1 text-sm text-white/70">
          Tréner: {event.trainers?.full_name || "-"} · Téma:{" "}
          {event.training_topics?.name || "Bez témy"}
        </p>
      </div>

      {canWriteAttendance && (
        <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 space-y-3">
          <h2 className="text-xl font-extrabold">Pridať registrovaného žiaka</h2>

          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px]"
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
            className="h-[54px] w-full rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
          >
            + Pridať do prezenčky
          </button>
        </div>
      )}

      {canWriteAttendance && (
        <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 space-y-3">
          <h2 className="text-xl font-extrabold">Externý účastník</h2>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Meno"
              value={extFirst}
              onChange={(e) => setExtFirst(e.target.value)}
              className="h-[52px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px]"
            />
            <input
              placeholder="Priezvisko"
              value={extLast}
              onChange={(e) => setExtLast(e.target.value)}
              className="h-[52px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px]"
            />
          </div>

          <button
            onClick={addExternal}
            className="h-[54px] w-full rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
          >
            + Pridať externého
          </button>
        </div>
      )}

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <h2 className="mb-4 text-2xl font-extrabold">Registrovaní účastníci</h2>

        {attendance.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/60">
            Zatiaľ nie sú pridaní žiadni registrovaní žiaci.
          </p>
        ) : (
          <div className="grid gap-3">
            {attendance.map((row) => {
              const status = row.status as Status;

              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4"
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
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/10 active:scale-[0.98]"
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

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <h2 className="mb-4 text-2xl font-extrabold">Externí účastníci</h2>

        {external.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/60">
            Zatiaľ nie sú pridaní žiadni externí účastníci.
          </p>
        ) : (
          <div className="grid gap-3">
            {external.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4"
              >
                <div>
                  <p className="text-lg font-bold">
                    {row.first_name} {row.last_name}
                  </p>
                  <p className="text-sm text-black/60">Externý účastník</p>
                </div>

                <div className="flex gap-2">
                  {canWriteAttendance && (
                    <button
                      onClick={() => toggleExternal(row)}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
                        row.status === "present" ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {row.status === "present" ? <Check /> : <X />}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => deleteExternal(row.id)}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/10 active:scale-[0.98]"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
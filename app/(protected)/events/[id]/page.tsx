"use client";

import { usePermissions } from "@/lib/usePermissions";
import { createClient } from "@/lib/supabase/browser";
import {
  Check,
  ClipboardCheck,
  Plus,
  Search,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const canWriteAttendance =
    !!permissions?.can_attendance || !!permissions?.can_manage_trainers;

  const canDelete =
    !!permissions?.can_delete_students || !!permissions?.can_manage_trainers;

  async function loadData() {
    setLoading(true);

    const supabase = createClient();

    const [eventRes, studentsRes, attendanceRes, externalRes] =
      await Promise.all([
        supabase
          .from("events")
          .select("*, dojos(name), trainers(full_name), training_topics(name)")
          .eq("id", params.id)
          .single(),

        supabase
          .from("students")
          .select("*, dojos(name)")
          .eq("active", true)
          .order("last_name"),

        supabase
          .from("event_attendance")
          .select("*, students(first_name, last_name, technical_grade, dojos(name))")
          .eq("event_id", params.id),

        supabase
          .from("event_external_participants")
          .select("*")
          .eq("event_id", params.id)
          .order("created_at"),
      ]);

    if (eventRes.error) alert(eventRes.error.message);
    if (studentsRes.error) alert(studentsRes.error.message);
    if (attendanceRes.error) alert(attendanceRes.error.message);
    if (externalRes.error) alert(externalRes.error.message);

    setEvent(eventRes.data);
    setStudents(studentsRes.data || []);
    setAttendance(attendanceRes.data || []);
    setExternal(externalRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addStudent() {
    if (!canWriteAttendance) {
      alert("Nemáš oprávnenie zapisovať prezenčku.");
      return;
    }

    if (!selectedStudentId) return alert("Vyber cvičiaceho.");

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
      const { error } = await supabase
        .from("event_attendance")
        .update({ status: "absent" })
        .eq("id", row.id);

      if (error) return alert(error.message);
    }

    if (current === "absent") {
      const { error } = await supabase
        .from("event_attendance")
        .delete()
        .eq("id", row.id);

      if (error) return alert(error.message);
    }

    if (!current) {
      const { error } = await supabase
        .from("event_attendance")
        .update({ status: "present" })
        .eq("id", row.id);

      if (error) return alert(error.message);
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

  const availableStudents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return students
      .filter((s) => !alreadyAddedIds.includes(s.id))
      .filter((s) => {
        if (!q) return true;

        return [
          s.first_name,
          s.last_name,
          s.dojos?.name,
          s.technical_grade,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [students, alreadyAddedIds, search]);

  const presentRegistered = attendance.filter((a) => a.status === "present").length;
  const absentRegistered = attendance.filter((a) => a.status === "absent").length;
  const presentExternal = external.filter((a) => a.status === "present").length;
  const absentExternal = external.filter((a) => a.status === "absent").length;

  const totalPresent = presentRegistered + presentExternal;
  const totalAbsent = absentRegistered + absentExternal;
  const totalPeople = attendance.length + external.length;

  const inputClass =
    "h-[56px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white";

  const buttonRed =
    "inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]";

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center font-bold text-black/55 shadow-sm">
          Načítavam akciu...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Trophy size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Prezenčka akcie
          </p>

          <h1 className="mt-2 break-words text-4xl font-black tracking-tight">
            {event.name}
          </h1>

          <p className="mt-3 break-words text-sm text-white/70">
            {event.start_date}
            {event.end_date ? ` – ${event.end_date}` : ""} ·{" "}
            {event.dojos?.name || "Bez dojo"}
          </p>

          <p className="mt-1 break-words text-sm text-white/70">
            Tréner: {event.trainers?.full_name || "-"} · Téma:{" "}
            {event.training_topics?.name || "Bez témy"}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Spolu</p>
              <p className="text-3xl font-black">{totalPeople}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prítomní</p>
              <p className="text-3xl font-black text-green-300">{totalPresent}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Neprítomní</p>
              <p className="text-3xl font-black text-red-300">{totalAbsent}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Externí</p>
              <p className="text-3xl font-black">{external.length}</p>
            </div>
          </div>
        </div>
      </div>

      {canWriteAttendance && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
                <Users />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Registrovaný žiak
                </p>
                <h2 className="text-2xl font-black">Pridať do prezenčky</h2>
              </div>
            </div>

            <div className="relative mb-3">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hľadaj meno, dojo alebo stupeň..."
                className={`${inputClass} pl-11`}
              />
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className={inputClass}
            >
              <option value="">Vyber cvičiaceho</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.last_name} {student.first_name} — {student.dojos?.name}
                </option>
              ))}
            </select>

            <button onClick={addStudent} className={`${buttonRed} mt-3`}>
              <Plus size={20} />
              Pridať registrovaného
            </button>
          </div>

          <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#111] text-white">
                <UserPlus />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Externý účastník
                </p>
                <h2 className="text-2xl font-black">Pridať hosťa</h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Meno"
                value={extFirst}
                onChange={(e) => setExtFirst(e.target.value)}
                className={inputClass}
              />

              <input
                placeholder="Priezvisko"
                value={extLast}
                onChange={(e) => setExtLast(e.target.value)}
                className={inputClass}
              />
            </div>

            <button onClick={addExternal} className={`${buttonRed} mt-3`}>
              <Plus size={20} />
              Pridať externého
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-800">
            <ClipboardCheck />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Prezenčka
            </p>
            <h2 className="text-2xl font-black">Registrovaní účastníci</h2>
          </div>
        </div>

        {attendance.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-sm font-bold text-black/55">
            Zatiaľ nie sú pridaní žiadni registrovaní žiaci.
          </p>
        ) : (
          <div className="grid gap-3">
            {attendance.map((row) => {
              const status = row.status as Status;

              return (
                <div
                  key={row.id}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-lg font-black">
                      {row.students?.first_name} {row.students?.last_name}
                    </p>
                    <p className="break-words text-sm text-black/55">
                      {row.students?.technical_grade || "Bez stupňa"} ·{" "}
                      {row.students?.dojos?.name || "Bez dojo"}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canWriteAttendance && (
                      <button
                        onClick={() => cycleStatus(row)}
                        className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-4 font-black text-white active:scale-[0.96] ${
                          status === "present"
                            ? "bg-green-600"
                            : status === "absent"
                            ? "bg-red-600"
                            : "bg-black/30"
                        }`}
                      >
                        {status === "present" && <Check size={20} />}
                        {status === "absent" && <X size={20} />}
                        {!status && "?"}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => removeStudent(row.id)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black active:scale-[0.96]"
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

      <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
            <UserPlus />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Hostia
            </p>
            <h2 className="text-2xl font-black">Externí účastníci</h2>
          </div>
        </div>

        {external.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-sm font-bold text-black/55">
            Zatiaľ nie sú pridaní žiadni externí účastníci.
          </p>
        ) : (
          <div className="grid gap-3">
            {external.map((row) => (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-lg font-black">
                    {row.first_name} {row.last_name}
                  </p>
                  <p className="text-sm text-black/55">Externý účastník</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {canWriteAttendance && (
                    <button
                      onClick={() => toggleExternal(row)}
                      className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-4 font-black text-white active:scale-[0.96] ${
                        row.status === "present" ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {row.status === "present" ? <Check size={20} /> : <X size={20} />}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => deleteExternal(row.id)}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black active:scale-[0.96]"
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

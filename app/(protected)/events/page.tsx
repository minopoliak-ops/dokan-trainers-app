"use client";

import { usePermissions } from "@/lib/usePermissions";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "present" | "absent" | null;

type PageParams = {
  id?: string;
};

function statusLabel(status: Status) {
  if (status === "present") return "Prítomný";
  if (status === "absent") return "Neprítomný";
  return "Neoznačený";
}

function statusButtonClass(status: Status) {
  if (status === "present") return "bg-green-600 text-white shadow-[0_8px_18px_rgba(22,163,74,0.25)]";
  if (status === "absent") return "bg-red-600 text-white shadow-[0_8px_18px_rgba(220,38,38,0.25)]";
  return "bg-black/10 text-black";
}

function statusPillClass(status: Status) {
  if (status === "present") return "bg-green-100 text-green-800";
  if (status === "absent") return "bg-red-100 text-red-800";
  return "bg-black/10 text-black/60";
}

export default function EventDetailPage({ params }: { params: PageParams }) {
  const eventId = params?.id;
  const { permissions } = usePermissions();

  const [event, setEvent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [external, setExternal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [extFirst, setExtFirst] = useState("");
  const [extLast, setExtLast] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const canWriteAttendance =
    !!permissions?.can_attendance || !!permissions?.can_manage_trainers;

  const canDelete =
    !!permissions?.can_delete_students || !!permissions?.can_manage_trainers;

  async function loadData() {
    if (!eventId || eventId === "undefined") {
      setLoading(false);
      setErrorMessage("Chýba ID akcie. Otvor akciu zo zoznamu cez správny odkaz.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const [eventRes, studentsRes, attendanceRes, externalRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, dojos(name), trainers(full_name), training_topics(name)")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("students")
        .select("*, dojos(name)")
        .eq("active", true)
        .order("last_name"),
      supabase
        .from("event_attendance")
        .select("*, students(first_name, last_name, technical_grade, dojos(name))")
        .eq("event_id", eventId),
      supabase
        .from("event_external_participants")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at"),
    ]);

    if (eventRes.error) {
      setErrorMessage(eventRes.error.message);
      setLoading(false);
      return;
    }

    if (studentsRes.error) console.error(studentsRes.error.message);
    if (attendanceRes.error) console.error(attendanceRes.error.message);
    if (externalRes.error) console.error(externalRes.error.message);

    setEvent(eventRes.data);
    setStudents(studentsRes.data || []);
    setAttendance(attendanceRes.data || []);
    setExternal(externalRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  const alreadyAddedIds = useMemo(
    () => attendance.map((a) => a.student_id).filter(Boolean),
    [attendance]
  );

  const availableStudents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return students
      .filter((s) => !alreadyAddedIds.includes(s.id))
      .filter((s) => {
        if (!q) return true;

        return [s.first_name, s.last_name, s.technical_grade, s.dojos?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [students, alreadyAddedIds, search]);

  const stats = useMemo(() => {
    const registeredPresent = attendance.filter((a) => a.status === "present").length;
    const registeredAbsent = attendance.filter((a) => a.status === "absent").length;
    const externalPresent = external.filter((a) => a.status === "present").length;
    const externalAbsent = external.filter((a) => a.status === "absent").length;

    return {
      total: attendance.length + external.length,
      present: registeredPresent + externalPresent,
      absent: registeredAbsent + externalAbsent,
      registered: attendance.length,
      external: external.length,
    };
  }, [attendance, external]);

  async function addStudent() {
    if (!eventId || eventId === "undefined") return alert("Chýba ID akcie.");
    if (!canWriteAttendance) return alert("Nemáš oprávnenie zapisovať prezenčku.");
    if (!selectedStudentId) return alert("Vyber cvičiaceho.");

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("event_attendance").upsert(
      {
        event_id: eventId,
        student_id: selectedStudentId,
        status: "present",
      },
      { onConflict: "event_id,student_id" }
    );

    setSaving(false);

    if (error) return alert(error.message);

    setSelectedStudentId("");
    loadData();
  }

  async function cycleStatus(row: any) {
    if (!canWriteAttendance) return alert("Nemáš oprávnenie meniť prezenčku.");

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
      const { error } = await supabase.from("event_attendance").delete().eq("id", row.id);
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
    if (!canDelete) return alert("Nemáš oprávnenie odoberať cvičiacich.");
    if (!confirm("Odstrániť cvičiaceho z prezenčky?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("event_attendance").delete().eq("id", rowId);

    if (error) return alert(error.message);

    loadData();
  }

  async function addExternal() {
    if (!eventId || eventId === "undefined") return alert("Chýba ID akcie.");
    if (!canWriteAttendance) return alert("Nemáš oprávnenie zapisovať prezenčku.");
    if (!extFirst.trim() || !extLast.trim()) return alert("Vyplň meno a priezvisko.");

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("event_external_participants").insert({
      event_id: eventId,
      first_name: extFirst.trim(),
      last_name: extLast.trim(),
      status: "present",
    });

    setSaving(false);

    if (error) return alert(error.message);

    setExtFirst("");
    setExtLast("");
    loadData();
  }

  async function toggleExternal(row: any) {
    if (!canWriteAttendance) return alert("Nemáš oprávnenie meniť prezenčku.");

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
    if (!canDelete) return alert("Nemáš oprávnenie mazať účastníkov.");
    if (!confirm("Vymazať externého účastníka?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("event_external_participants")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  const inputClass =
    "h-[54px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center font-bold text-black/55 shadow-sm">
          Načítavam akciu...
        </div>
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-4">
        <div className="rounded-[30px] bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
          <ShieldAlert className="mx-auto mb-3 text-[#d71920]" size={34} />
          <h1 className="text-2xl font-black">Akcia sa nenašla</h1>
          <p className="mt-2 text-sm text-black/55">
            {errorMessage || "Skontroluj, či bol otvorený správny odkaz na akciu."}
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
        >
          <ArrowLeft size={18} />
          Späť na akcie
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <ClipboardCheck size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Prezenčka akcie
          </p>

          <h1 className="mt-2 break-words text-4xl font-black tracking-tight">
            {event.name}
          </h1>

          <div className="mt-4 grid gap-2 text-sm text-white/70">
            <p className="flex flex-wrap items-center gap-2">
              <CalendarDays size={16} />
              {event.start_date}
              {event.end_date ? ` – ${event.end_date}` : ""}
            </p>

            <p className="flex flex-wrap items-center gap-2">
              <MapPin size={16} />
              {event.dojos?.name || "Bez dojo"}
            </p>

            <p className="flex flex-wrap items-center gap-2">
              <GraduationCap size={16} />
              Tréner: {event.trainers?.full_name || "-"} · Téma: {event.training_topics?.name || "Bez témy"}
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Spolu</p>
              <p className="text-3xl font-black">{stats.total}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prítomní</p>
              <p className="text-3xl font-black">{stats.present}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Neprítomní</p>
              <p className="text-3xl font-black">{stats.absent}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Externí</p>
              <p className="text-3xl font-black">{stats.external}</p>
            </div>
          </div>
        </div>
      </div>

      {canWriteAttendance && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d71920] text-white">
                <UserPlus />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Registrovaný cvičiaci
                </p>
                <h2 className="text-2xl font-black">Pridať žiaka</h2>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hľadať meno, stupeň alebo dojo..."
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

              <button
                type="button"
                onClick={addStudent}
                disabled={saving || !selectedStudentId}
                className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-50"
              >
                <Plus size={20} />
                Pridať do prezenčky
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#111] text-white">
                <Users />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Hosť / externý
                </p>
                <h2 className="text-2xl font-black">Externý účastník</h2>
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

            <button
              type="button"
              onClick={addExternal}
              disabled={saving || !extFirst.trim() || !extLast.trim()}
              className="mt-3 inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98] disabled:opacity-50"
            >
              <Plus size={20} />
              Pridať externého
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Prezenčka
            </p>
            <h2 className="text-2xl font-black">Registrovaní účastníci</h2>
          </div>

          <span className="w-fit rounded-full bg-[#f7f2e8] px-4 py-2 text-sm font-black text-black/60">
            {attendance.length} záznamov
          </span>
        </div>

        {attendance.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/55">
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
                      {row.students?.technical_grade || "Bez stupňa"} · {row.students?.dojos?.name || "Bez dojo"}
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusPillClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canWriteAttendance && (
                      <button
                        type="button"
                        onClick={() => cycleStatus(row)}
                        className={`flex h-12 min-w-12 items-center justify-center rounded-2xl active:scale-[0.96] ${statusButtonClass(status)}`}
                        title="Klik prepína: prítomný → neprítomný → odstrániť"
                      >
                        {status === "present" && <Check />}
                        {status === "absent" && <X />}
                        {!status && <CheckCircle2 />}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => removeStudent(row.id)}
                        className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-black/10 text-black active:scale-[0.96] hover:bg-red-100"
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
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Hostia
            </p>
            <h2 className="text-2xl font-black">Externí účastníci</h2>
          </div>

          <span className="w-fit rounded-full bg-[#f7f2e8] px-4 py-2 text-sm font-black text-black/60">
            {external.length} záznamov
          </span>
        </div>

        {external.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/55">
            Zatiaľ nie sú pridaní žiadni externí účastníci.
          </p>
        ) : (
          <div className="grid gap-3">
            {external.map((row) => {
              const status = row.status as Status;

              return (
                <div
                  key={row.id}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-lg font-black">
                      {row.first_name} {row.last_name}
                    </p>
                    <p className="text-sm text-black/55">Externý účastník</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusPillClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {canWriteAttendance && (
                      <button
                        type="button"
                        onClick={() => toggleExternal(row)}
                        className={`flex h-12 min-w-12 items-center justify-center rounded-2xl active:scale-[0.96] ${statusButtonClass(status)}`}
                      >
                        {row.status === "present" ? <Check /> : <X />}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteExternal(row.id)}
                        className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-black/10 text-black active:scale-[0.96] hover:bg-red-100"
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

      <Link
        href="/events"
        className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        Späť na akcie
      </Link>
    </div>
  );
}

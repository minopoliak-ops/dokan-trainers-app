"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Handshake,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "present" | "absent" | null;

const topicColors = [
  "bg-red-50 border-red-100",
  "bg-blue-50 border-blue-100",
  "bg-green-50 border-green-100",
  "bg-yellow-50 border-yellow-100",
  "bg-purple-50 border-purple-100",
  "bg-orange-50 border-orange-100",
  "bg-pink-50 border-pink-100",
  "bg-cyan-50 border-cyan-100",
];

function topicColor(topicId?: string | null) {
  if (!topicId) return "bg-[#f7f2e8] border-black/5";

  let sum = 0;
  for (const char of topicId) sum += char.charCodeAt(0);

  return topicColors[sum % topicColors.length];
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString("sk-SK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthLabel(value: string) {
  if (!value) return "Vyber mesiac";

  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month - 1, 1);

  return d.toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  });
}

function previousMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month - 2, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  const d = new Date(year, month, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AttendancePage({ params }: { params: { id: string } }) {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [trainerDojoAccess, setTrainerDojoAccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedMobileTrainingId, setSelectedMobileTrainingId] = useState("");

  const isAdmin = !!permissions?.can_manage_trainers;
  const baseCanWriteAttendance = !!permissions?.can_attendance || isAdmin;

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthStart = `${selectedMonth}-01`;

  const monthEnd = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(
      2,
      "0"
    )}`;
  }, [selectedMonth]);

  const substitutionDates = useMemo(() => {
    return substitutions
      .filter((item) => item.status === "accepted")
      .map((item) => item.request_date)
      .filter(Boolean);
  }, [substitutions]);

  const substitutionByDate = useMemo(() => {
    const map = new Map<string, any>();

    substitutions
      .filter((item) => item.status === "accepted")
      .forEach((item) => {
        if (item.request_date) map.set(item.request_date, item);
      });

    return map;
  }, [substitutions]);

  const substitutedTrainings = useMemo(() => {
    return trainings.filter((training) =>
      substitutionDates.includes(training.training_date)
    );
  }, [trainings, substitutionDates]);

  const selectedMobileTraining =
    trainings.find((t) => t.id === selectedMobileTrainingId) || trainings[0];

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();

    if (!q) return students;

    return students.filter((student) =>
      [
        student.first_name,
        student.last_name,
        student.technical_grade,
        student.email,
        student.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [students, studentSearch]);

  const monthStats = useMemo(() => {
    const trainingIds = new Set(trainings.map((training) => training.id));

    const relevantAttendance = attendance.filter((item) =>
      trainingIds.has(item.training_id)
    );

    const present = relevantAttendance.filter((a) => a.status === "present").length;
    const absent = relevantAttendance.filter((a) => a.status === "absent").length;

    return {
      students: students.length,
      trainings: trainings.length,
      present,
      absent,
      substitutionDays: substitutionDates.length,
    };
  }, [attendance, students.length, trainings, substitutionDates.length]);

  async function loadSubstitutionAccess(supabase: any) {
    if (!permissions?.id) {
      setSubstitutions([]);
      return [];
    }

    const { data, error } = await supabase
      .from("training_substitution_requests")
      .select(
        `
        *,
        requester:trainers!training_substitution_requests_requester_id_fkey(full_name,email),
        trainings(id,title,training_date,training_topics(name))
      `
      )
      .eq("substitute_id", permissions.id)
      .eq("dojo_id", params.id)
      .eq("status", "accepted")
      .gte("request_date", monthStart)
      .lte("request_date", monthEnd);

    if (error) {
      console.error(error.message);
      setSubstitutions([]);
      return [];
    }

    setSubstitutions(data || []);
    return data || [];
  }

  async function loadTrainerDojoAccess(supabase: any) {
    if (!permissions?.id || isAdmin) {
      setTrainerDojoAccess(isAdmin);
      return isAdmin;
    }

    const { data, error } = await supabase
      .from("trainer_dojos")
      .select("id")
      .eq("trainer_id", permissions.id)
      .eq("dojo_id", params.id)
      .maybeSingle();

    if (error) {
      console.error(error.message);
      setTrainerDojoAccess(false);
      return false;
    }

    const hasAccess = !!data;
    setTrainerDojoAccess(hasAccess);
    return hasAccess;
  }

  function canReadPage() {
    return isAdmin || trainerDojoAccess || substitutions.length > 0;
  }

  function canWriteTraining(training: any) {
    if (!baseCanWriteAttendance) return false;
    if (isAdmin || trainerDojoAccess) return true;

    return substitutionDates.includes(training.training_date);
  }

  function getAttendance(trainingId: string, studentId: string): Status {
    return (
      attendance.find(
        (a) => a.training_id === trainingId && a.student_id === studentId
      )?.status || null
    );
  }

  async function loadData() {
    if (permissionsLoading) return;

    if (!permissions?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const [normalAccess, substitutionRows] = await Promise.all([
      loadTrainerDojoAccess(supabase),
      loadSubstitutionAccess(supabase),
    ]);

    const hasAnyAccess = isAdmin || normalAccess || substitutionRows.length > 0;

    if (!hasAnyAccess) {
      setDojo(null);
      setStudents([]);
      setTopics([]);
      setTrainings([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    const { data: dojoData } = await supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    const { data: studentsData } = await supabase
      .from("students")
      .select("*")
      .eq("dojo_id", params.id)
      .eq("active", true)
      .order("last_name");

    const { data: topicsData } = await supabase
      .from("training_topics")
      .select("*")
      .eq("active", true)
      .order("name");

    const { data: trainingsData } = await supabase
      .from("trainings")
      .select("*, training_topics(name)")
      .eq("dojo_id", params.id)
      .gte("training_date", monthStart)
      .lte("training_date", monthEnd)
      .order("training_date", { ascending: true });

    const trainingIds = (trainingsData || []).map((training: any) => training.id);

    const attendanceResult =
      trainingIds.length > 0
        ? await supabase
            .from("attendance")
            .select("*")
            .in("training_id", trainingIds)
        : { data: [] };

    setDojo(dojoData);
    setStudents(studentsData || []);
    setTopics(topicsData || []);
    setTrainings(trainingsData || []);
    setAttendance(attendanceResult.data || []);

    if (!selectedMobileTrainingId && (trainingsData || []).length > 0) {
      setSelectedMobileTrainingId(trainingsData![0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const supabase = createClient();

    const attendanceChannel = supabase
      .channel(`attendance-live-${params.id}-${selectedMonth}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
        },
        () => loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_substitution_requests",
        },
        () => loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, [permissions?.id, permissionsLoading, selectedMonth, params.id]);

  async function setAttendanceStatus(
    trainingId: string,
    studentId: string,
    nextStatus: Status
  ) {
    const training = trainings.find((item) => item.id === trainingId);

    if (!training || !canWriteTraining(training)) {
      alert("Nemáš oprávnenie zapisovať prezenčku pre tento deň.");
      return;
    }

    const supabase = createClient();

    if (nextStatus === null) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("training_id", trainingId)
        .eq("student_id", studentId);

      if (error) return alert(error.message);

      setAttendance((prev) =>
        prev.filter(
          (item) =>
            !(item.training_id === trainingId && item.student_id === studentId)
        )
      );

      return;
    }

    const row = {
      training_id: trainingId,
      student_id: studentId,
      status: nextStatus,
    };

    const { error } = await supabase
      .from("attendance")
      .upsert(row, { onConflict: "training_id,student_id" });

    if (error) return alert(error.message);

    setAttendance((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(item.training_id === trainingId && item.student_id === studentId)
      );

      return [...filtered, row];
    });
  }

  async function markAll(trainingId: string, status: "present" | "absent") {
    const training = trainings.find((item) => item.id === trainingId);

    if (!training || !canWriteTraining(training)) {
      alert("Nemáš oprávnenie zapisovať prezenčku pre tento deň.");
      return;
    }

    const rows = filteredStudents.map((student) => ({
      training_id: trainingId,
      student_id: student.id,
      status,
    }));

    if (rows.length === 0) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "training_id,student_id" });

    if (error) return alert(error.message);

    setAttendance((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
            item.training_id === trainingId &&
            filteredStudents.some((student) => student.id === item.student_id)
          )
      );

      return [...filtered, ...rows];
    });
  }

  async function clearTraining(trainingId: string) {
    const training = trainings.find((item) => item.id === trainingId);

    if (!training || !canWriteTraining(training)) {
      alert("Nemáš oprávnenie zapisovať prezenčku pre tento deň.");
      return;
    }

    if (!confirm("Vymazať označenia pre tento tréning?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("training_id", trainingId);

    if (error) return alert(error.message);

    setAttendance((prev) =>
      prev.filter((item) => item.training_id !== trainingId)
    );
  }

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 font-bold shadow-sm">
          Načítavam prezenčku...
        </div>
      </div>
    );
  }

  if (!dojo || !canReadPage()) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-4">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-3 text-black/35" size={34} />
          <h1 className="text-2xl font-black">
            Dojo sa nenašlo alebo nemáš prístup k tejto prezenčke.
          </h1>
          <p className="mt-2 text-sm font-semibold text-black/55">
            Ak máš potvrdený záskok, prístup sa otvorí iba pre konkrétny deň a dojo.
          </p>
        </div>

        <Link
          href="/dojos"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-4 font-black text-white"
        >
          <ArrowLeft size={18} />
          Späť na dojo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <CalendarCheck size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Mesačná prezenčka
          </p>

          <h1 className="mt-2 break-words text-4xl font-black tracking-tight">
            {dojo.name}
          </h1>

          <p className="mt-2 max-w-2xl text-white/65">
            {dojo.address || "Bez adresy"} · {formatMonthLabel(selectedMonth)}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Žiaci</p>
              <p className="text-3xl font-black">{monthStats.students}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Tréningy</p>
              <p className="text-3xl font-black">{monthStats.trainings}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prítomní</p>
              <p className="text-3xl font-black text-green-300">
                {monthStats.present}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Neprítomní</p>
              <p className="text-3xl font-black text-red-300">
                {monthStats.absent}
              </p>
            </div>

            <div
              className={`rounded-2xl p-4 ${
                monthStats.substitutionDays > 0
                  ? "bg-indigo-600"
                  : "bg-white/10"
              }`}
            >
              <p className="text-sm text-white/50">Záskok dni</p>
              <p className="text-3xl font-black text-amber-300">
                {monthStats.substitutionDays}
              </p>
            </div>
          </div>
        </div>
      </div>

      {substitutions.length > 0 && !trainerDojoAccess && !isAdmin && (
        <div className="rounded-[30px] bg-indigo-600 p-5 text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Handshake size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-white/65">
                Zastupovanie aktívne
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Prezenčka odomknutá len na potvrdené dni
              </h2>

              <p className="mt-1 font-semibold text-white/80">
                Dni:{" "}
                {substitutionDates
                  .map((date) => new Date(date).toLocaleDateString("sk-SK"))
                  .join(", ")}
              </p>

              <p className="mt-2 text-sm font-semibold text-white/70">
                Nasledujúci deň sa prístup k cudziemu dojo automaticky stratí.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[auto_1fr_auto]">
        <button
          type="button"
          onClick={() => setSelectedMonth(previousMonthValue(selectedMonth))}
          className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[24px] bg-white px-4 font-black shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <ChevronLeft size={18} />
          Predošlý
        </button>

        <div className="rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-black/10">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-[48px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-center text-base font-black outline-none focus:border-[#d71920] focus:bg-white"
          />
        </div>

        <button
          type="button"
          onClick={() => setSelectedMonth(nextMonthValue(selectedMonth))}
          className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[24px] bg-white px-4 font-black shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          Ďalší
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Prezenčka
            </p>
            <h2 className="text-2xl font-black">Mesačný prehľad</h2>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Hľadať žiaka..."
                className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] pl-11 pr-4 font-bold outline-none md:w-[260px]"
              />
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
            >
              <RefreshCcw size={18} />
              Obnoviť
            </button>
          </div>
        </div>

        {trainings.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-6 text-center font-semibold text-black/55">
            V tomto mesiaci ešte nie sú zadané tréningy.
          </p>
        ) : filteredStudents.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-6 text-center font-semibold text-black/55">
            Nenašli sa žiadni žiaci pre tento filter.
          </p>
        ) : (
          <>
            <div className="block md:hidden">
              <select
                value={selectedMobileTraining?.id || ""}
                onChange={(e) => setSelectedMobileTrainingId(e.target.value)}
                className="mb-4 h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black"
              >
                {trainings.map((training) => (
                  <option key={training.id} value={training.id}>
                    {formatLongDate(training.training_date)} ·{" "}
                    {training.training_topics?.name || training.title || "Bez témy"}
                  </option>
                ))}
              </select>

              {selectedMobileTraining && (
                <div
                  className={`mb-4 rounded-3xl border p-4 ring-1 ring-black/5 ${topicColor(
                    selectedMobileTraining.topic_id
                  )}`}
                >
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">
                    Vybraný tréning
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black">
                      {formatLongDate(selectedMobileTraining.training_date)}
                    </h3>

                    {substitutionDates.includes(
                      selectedMobileTraining.training_date
                    ) && (
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                        Záskok
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-black/55">
                    {selectedMobileTraining.training_topics?.name ||
                      selectedMobileTraining.title ||
                      "Bez témy"}
                  </p>

                  {substitutionByDate.get(selectedMobileTraining.training_date)
                    ?.topics_note && (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-black/40">
                        <Dumbbell size={14} />
                        Témy od trénera
                      </p>
                      <p className="whitespace-pre-wrap text-sm font-semibold text-black/70">
                        {
                          substitutionByDate.get(
                            selectedMobileTraining.training_date
                          )?.topics_note
                        }
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => markAll(selectedMobileTraining.id, "present")}
                      disabled={!canWriteTraining(selectedMobileTraining)}
                      className="rounded-2xl bg-green-600 px-3 py-3 font-black text-white disabled:opacity-35"
                    >
                      Všetci ✓
                    </button>

                    <button
                      type="button"
                      onClick={() => markAll(selectedMobileTraining.id, "absent")}
                      disabled={!canWriteTraining(selectedMobileTraining)}
                      className="rounded-2xl bg-red-600 px-3 py-3 font-black text-white disabled:opacity-35"
                    >
                      Všetci ✕
                    </button>

                    <button
                      type="button"
                      onClick={() => clearTraining(selectedMobileTraining.id)}
                      disabled={!canWriteTraining(selectedMobileTraining)}
                      className="rounded-2xl bg-black/10 px-3 py-3 font-black text-black disabled:opacity-35"
                    >
                      Reset
                    </button>
                  </div>

                  {!canWriteTraining(selectedMobileTraining) && (
                    <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-black/55">
                      Tento deň nemáš odomknutý na zápis.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-3">
                {filteredStudents.map((student) => {
                  const status = selectedMobileTraining
                    ? getAttendance(selectedMobileTraining.id, student.id)
                    : null;

                  return (
                    <div
                      key={student.id}
                      className="rounded-3xl bg-[#f7f2e8] p-4 ring-1 ring-black/5"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-black">
                            {student.first_name} {student.last_name}
                          </p>

                          <p className="text-sm font-semibold text-black/55">
                            {student.technical_grade || "Bez stupňa"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            status === "present"
                              ? "bg-green-100 text-green-800"
                              : status === "absent"
                              ? "bg-red-100 text-red-800"
                              : "bg-black/10 text-black/55"
                          }`}
                        >
                          {status === "present"
                            ? "Prítomný"
                            : status === "absent"
                            ? "Neprítomný"
                            : "Neoznačené"}
                        </span>
                      </div>

                      {selectedMobileTraining && (
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={!canWriteTraining(selectedMobileTraining)}
                            onClick={() =>
                              setAttendanceStatus(
                                selectedMobileTraining.id,
                                student.id,
                                "present"
                              )
                            }
                            className={`flex h-12 items-center justify-center rounded-2xl text-white disabled:opacity-35 ${
                              status === "present" ? "bg-green-600" : "bg-black/15"
                            }`}
                          >
                            <Check size={20} />
                          </button>

                          <button
                            type="button"
                            disabled={!canWriteTraining(selectedMobileTraining)}
                            onClick={() =>
                              setAttendanceStatus(
                                selectedMobileTraining.id,
                                student.id,
                                "absent"
                              )
                            }
                            className={`flex h-12 items-center justify-center rounded-2xl text-white disabled:opacity-35 ${
                              status === "absent" ? "bg-red-600" : "bg-black/15"
                            }`}
                          >
                            <X size={20} />
                          </button>

                          <button
                            type="button"
                            disabled={!canWriteTraining(selectedMobileTraining)}
                            onClick={() =>
                              setAttendanceStatus(
                                selectedMobileTraining.id,
                                student.id,
                                null
                              )
                            }
                            className="flex h-12 items-center justify-center rounded-2xl bg-black/10 text-black disabled:opacity-35"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="-mx-5 hidden overflow-x-auto px-5 md:block">
              <table className="min-w-max border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-30 min-w-[240px] border-b bg-white p-3 text-left">
                      <div className="flex items-center gap-2">
                        <Users size={18} />
                        Žiak
                      </div>
                    </th>

                    {trainings.map((training) => {
                      const isSubstitutionDay = substitutionDates.includes(
                        training.training_date
                      );

                      return (
                        <th
                          key={training.id}
                          className="min-w-[175px] border-b p-3 text-center"
                        >
                          <div
                            className={`rounded-3xl border p-3 shadow-sm ${topicColor(
                              training.topic_id
                            )}`}
                          >
                            <p className="text-lg font-black">
                              {formatDate(training.training_date)}
                            </p>

                            <p className="text-xs font-bold text-black/45">
                              {formatLongDate(training.training_date)}
                            </p>

                            <p className="mt-1 text-xs font-bold text-black/55">
                              {training.training_topics?.name ||
                                training.title ||
                                "Bez témy"}
                            </p>

                            {isSubstitutionDay && (
                              <p className="mt-2 rounded-xl bg-indigo-600 px-2 py-1 text-xs font-black text-white">
                                Záskok
                              </p>
                            )}

                            <div className="mt-2 grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => markAll(training.id, "present")}
                                disabled={!canWriteTraining(training)}
                                className="rounded-xl bg-green-600 px-2 py-2 text-xs font-black text-white disabled:opacity-35"
                              >
                                ✓
                              </button>

                              <button
                                type="button"
                                onClick={() => markAll(training.id, "absent")}
                                disabled={!canWriteTraining(training)}
                                className="rounded-xl bg-red-600 px-2 py-2 text-xs font-black text-white disabled:opacity-35"
                              >
                                ✕
                              </button>

                              <button
                                type="button"
                                onClick={() => clearTraining(training.id)}
                                disabled={!canWriteTraining(training)}
                                className="rounded-xl bg-black/20 px-2 py-2 text-xs font-black text-black disabled:opacity-35"
                              >
                                ↺
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="sticky left-0 z-20 min-w-[240px] border-b bg-white p-3 shadow-[8px_0_12px_-12px_rgba(0,0,0,0.5)]">
                        <p className="font-black leading-tight">
                          {student.first_name} {student.last_name}
                        </p>

                        <p className="text-sm text-black/55">
                          {student.technical_grade || "Bez stupňa"}
                        </p>
                      </td>

                      {trainings.map((training) => {
                        const status = getAttendance(training.id, student.id);
                        const canWrite = canWriteTraining(training);

                        return (
                          <td key={training.id} className="border-b p-3 text-center">
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                disabled={!canWrite}
                                onClick={() =>
                                  setAttendanceStatus(
                                    training.id,
                                    student.id,
                                    "present"
                                  )
                                }
                                className={`flex h-11 items-center justify-center rounded-xl text-white disabled:opacity-35 ${
                                  status === "present"
                                    ? "bg-green-600"
                                    : "bg-black/15"
                                }`}
                              >
                                <Check size={18} />
                              </button>

                              <button
                                type="button"
                                disabled={!canWrite}
                                onClick={() =>
                                  setAttendanceStatus(
                                    training.id,
                                    student.id,
                                    "absent"
                                  )
                                }
                                className={`flex h-11 items-center justify-center rounded-xl text-white disabled:opacity-35 ${
                                  status === "absent"
                                    ? "bg-red-600"
                                    : "bg-black/15"
                                }`}
                              >
                                <X size={18} />
                              </button>

                              <button
                                type="button"
                                disabled={!canWrite}
                                onClick={() =>
                                  setAttendanceStatus(training.id, student.id, null)
                                }
                                className="flex h-11 items-center justify-center rounded-xl bg-black/10 text-black disabled:opacity-35"
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Link
        href={`/dojos/${params.id}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-4 text-center font-black text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        Späť do dojo
      </Link>
    </div>
  );
}

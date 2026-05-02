"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "present" | "absent" | null;
type StudentFilter = "all" | "visible" | "hidden";

const weekDays = [
  { value: 1, label: "Po" },
  { value: 2, label: "Ut" },
  { value: 3, label: "St" },
  { value: 4, label: "Št" },
  { value: 5, label: "Pi" },
  { value: 6, label: "So" },
  { value: 0, label: "Ne" },
];

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
  });
}

export default function AttendancePage({ params }: { params: { id: string } }) {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [hiddenStudents, setHiddenStudents] = useState<string[]>([]);

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("visible");
  const [showSetup, setShowSetup] = useState(false);

  const isAdmin = !!permissions?.can_manage_trainers;
  const canWriteAttendance = !!permissions?.can_attendance || isAdmin;
  const canCreateTrainings = !!permissions?.can_create_trainings || isAdmin;

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [bulkTopicId, setBulkTopicId] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("Tréning");

  const [generateDays, setGenerateDays] = useState<number[]>([2, 4]);
  const [generateTopicId, setGenerateTopicId] = useState("");
  const [generateTitle, setGenerateTitle] = useState("Tréning");

  const monthStart = `${selectedMonth}-01`;

  const monthEnd = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(
      2,
      "0"
    )}`;
  }, [selectedMonth]);

  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 2, 1);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonth]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();

    return students.filter((student) => {
      const hidden = hiddenStudents.includes(student.id);

      if (studentFilter === "visible" && hidden) return false;
      if (studentFilter === "hidden" && !hidden) return false;

      if (!q) return true;

      return [
        student.first_name,
        student.last_name,
        student.technical_grade,
        student.email,
        student.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, hiddenStudents, studentSearch, studentFilter]);

  const visibleStudents = filteredStudents.filter(
    (s) => !hiddenStudents.includes(s.id)
  );

  const monthStats = useMemo(() => {
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const totalSlots = students.length * trainings.length;
    const marked = present + absent;
    const unmarked = Math.max(totalSlots - marked, 0);
    const percent = totalSlots > 0 ? Math.round((present / totalSlots) * 100) : 0;

    return {
      students: students.length,
      trainings: trainings.length,
      present,
      absent,
      unmarked,
      percent,
    };
  }, [attendance, students.length, trainings.length]);

  async function checkAccess(supabase: any) {
    if (permissionsLoading) return false;

    const isAdminNow = !!permissions?.can_manage_trainers;

    if (isAdminNow) return true;
    if (!permissions?.id) return false;

    const { data: link, error } = await supabase
      .from("trainer_dojos")
      .select("id")
      .eq("trainer_id", permissions.id)
      .eq("dojo_id", params.id)
      .maybeSingle();

    if (error) {
      console.error("Attendance access error:", error);
      return false;
    }

    return !!link;
  }

  async function loadData() {
    if (permissionsLoading) return;

    if (!permissions?.id) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const hasAccess = await checkAccess(supabase);

    if (!hasAccess) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAllowed(true);

    const dojoResult = await supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (dojoResult.error) {
      console.error("Dojo error:", dojoResult.error);
      setDojo(null);
      setLoading(false);
      return;
    }

    const studentsResult = await supabase
      .from("students")
      .select("*")
      .eq("dojo_id", params.id)
      .eq("active", true)
      .order("last_name");

    const topicsResult = await supabase
      .from("training_topics")
      .select("*")
      .eq("active", true)
      .order("name");

    const trainingsResult = await supabase
      .from("trainings")
      .select("*, training_topics(name)")
      .eq("dojo_id", params.id)
      .gte("training_date", monthStart)
      .lte("training_date", monthEnd)
      .order("training_date");

    const blackoutResult = await supabase
      .from("training_blackout_dates")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const trainingIds = (trainingsResult.data || []).map((t: any) => t.id);

    const attendanceResult =
      trainingIds.length > 0
        ? await supabase
            .from("attendance")
            .select("*")
            .in("training_id", trainingIds)
        : { data: [], error: null };

    if (studentsResult.error) console.error(studentsResult.error);
    if (topicsResult.error) console.error(topicsResult.error);
    if (trainingsResult.error) console.error(trainingsResult.error);
    if (blackoutResult.error) console.error(blackoutResult.error);
    if (attendanceResult.error) console.error(attendanceResult.error);

    setDojo(dojoResult.data);
    setStudents(studentsResult.data || []);
    setTopics(topicsResult.data || []);
    setTrainings(trainingsResult.data || []);
    setAttendance(attendanceResult.data || []);
    setBlackouts(blackoutResult.data || []);
    setHiddenStudents([]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [permissions, permissionsLoading, selectedMonth, params.id]);

  async function updateTrainingTopic(trainingId: string, newTopicId: string) {
    if (!canCreateTrainings) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("trainings")
      .update({ topic_id: newTopicId || null })
      .eq("id", trainingId);

    if (error) return alert(error.message);

    setTrainings((prev) =>
      prev.map((t) =>
        t.id === trainingId
          ? {
              ...t,
              topic_id: newTopicId || null,
              training_topics: topics.find((tp) => tp.id === newTopicId) || null,
            }
          : t
      )
    );
  }

  async function applyTopicToAllTrainings() {
    if (!canCreateTrainings) return;
    if (trainings.length === 0) return alert("V tomto mesiaci nie sú tréningy.");

    const supabase = createClient();

    const { error } = await supabase
      .from("trainings")
      .update({ topic_id: bulkTopicId || null })
      .eq("dojo_id", params.id)
      .gte("training_date", monthStart)
      .lte("training_date", monthEnd);

    if (error) return alert(error.message);

    const topic = topics.find((t) => t.id === bulkTopicId) || null;

    setTrainings((prev) =>
      prev.map((t) => ({
        ...t,
        topic_id: bulkTopicId || null,
        training_topics: topic,
      }))
    );
  }

  async function copyTopicsFromPreviousMonth() {
    if (!canCreateTrainings) return;

    const supabase = createClient();

    const [year, month] = previousMonth.split("-").map(Number);
    const prevLastDay = new Date(year, month, 0).getDate();
    const prevStart = `${previousMonth}-01`;
    const prevEnd = `${previousMonth}-${String(prevLastDay).padStart(2, "0")}`;

    const { data: previousTrainings, error } = await supabase
      .from("trainings")
      .select("training_date, topic_id, training_topics(name)")
      .eq("dojo_id", params.id)
      .gte("training_date", prevStart)
      .lte("training_date", prevEnd)
      .order("training_date");

    if (error) return alert(error.message);
    if (!previousTrainings || previousTrainings.length === 0) {
      return alert("V minulom mesiaci nie sú tréningy s témami.");
    }

    const updates = trainings
      .map((training, index) => {
        const previous = previousTrainings[index];
        if (!previous) return null;

        return {
          id: training.id,
          topic_id: previous.topic_id || null,
        };
      })
      .filter(Boolean) as any[];

    for (const update of updates) {
      await supabase
        .from("trainings")
        .update({ topic_id: update.topic_id })
        .eq("id", update.id);
    }

    setTrainings((prev) =>
      prev.map((training, index) => {
        const previous = previousTrainings[index];
        const topic = topics.find((t) => t.id === previous?.topic_id) || null;

        return previous
          ? {
              ...training,
              topic_id: previous.topic_id || null,
              training_topics: topic,
            }
          : training;
      })
    );

    alert("Témy z minulého mesiaca boli skopírované.");
  }

  async function addTraining() {
    if (!canCreateTrainings) return alert("Nemáš oprávnenie vytvárať tréningy.");
    if (!trainingDate) return alert("Vyber dátum tréningu.");

    const supabase = createClient();

    const { error } = await supabase.from("trainings").upsert(
      {
        dojo_id: params.id,
        training_date: trainingDate,
        title: title || "Tréning",
        topic_id: topicId || null,
      },
      { onConflict: "dojo_id,training_date" }
    );

    if (error) return alert(error.message);

    setTrainingDate("");
    setTopicId("");
    setTitle("Tréning");
    loadData();
  }

  async function generateTrainings() {
    if (!canCreateTrainings) return alert("Nemáš oprávnenie vytvárať tréningy.");
    if (generateDays.length === 0) return alert("Vyber aspoň jeden deň v týždni.");

    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const blackoutMap = new Map(blackouts.map((b) => [b.date, b.reason]));

    const rows: any[] = [];
    const skipped: string[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();

      if (!generateDays.includes(weekday)) continue;

      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      if (blackoutMap.has(dateString)) {
        skipped.push(`${dateString} - ${blackoutMap.get(dateString)}`);
        continue;
      }

      rows.push({
        dojo_id: params.id,
        training_date: dateString,
        title: generateTitle || "Tréning",
        topic_id: generateTopicId || null,
      });
    }

    if (rows.length === 0) {
      return alert("Nenašli sa žiadne tréningové dátumy v tomto mesiaci.");
    }

    const supabase = createClient();

    const { error } = await supabase.from("trainings").upsert(rows, {
      onConflict: "dojo_id,training_date",
    });

    if (error) return alert(error.message);

    let message = `Vygenerované tréningy: ${rows.length}`;
    if (skipped.length > 0) message += `\n\nPreskočené dni:\n${skipped.join("\n")}`;

    alert(message);
    loadData();
  }

  function toggleGenerateDay(day: number) {
    setGenerateDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    );
  }

  function getAttendance(trainingId: string, studentId: string): Status {
    return (
      attendance.find(
        (a) => a.training_id === trainingId && a.student_id === studentId
      )?.status || null
    );
  }

  async function setAttendanceStatus(
    trainingId: string,
    studentId: string,
    next: Status
  ) {
    if (!canWriteAttendance) return alert("Nemáš oprávnenie zapisovať prezenčku.");

    const supabase = createClient();

    if (next === null) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("training_id", trainingId)
        .eq("student_id", studentId);

      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("attendance").upsert(
        { training_id: trainingId, student_id: studentId, status: next },
        { onConflict: "training_id,student_id" }
      );

      if (error) return alert(error.message);
    }

    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) => !(a.training_id === trainingId && a.student_id === studentId)
      );

      if (next === null) return filtered;

      return [
        ...filtered,
        { training_id: trainingId, student_id: studentId, status: next },
      ];
    });
  }

  async function cycleAttendance(trainingId: string, studentId: string) {
    const current = getAttendance(trainingId, studentId);

    let next: Status = null;
    if (!current) next = "present";
    else if (current === "present") next = "absent";
    else next = null;

    setAttendanceStatus(trainingId, studentId, next);
  }

  async function markAll(trainingId: string, status: "present" | "absent") {
    if (!canWriteAttendance) return;

    const supabase = createClient();

    const rows = visibleStudents.map((s) => ({
      training_id: trainingId,
      student_id: s.id,
      status,
    }));

    const { error } = await supabase.from("attendance").upsert(rows, {
      onConflict: "training_id,student_id",
    });

    if (error) return alert(error.message);

    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) =>
          !(
            a.training_id === trainingId &&
            visibleStudents.some((s) => s.id === a.student_id)
          )
      );

      return [...filtered, ...rows];
    });
  }

  async function clearTraining(trainingId: string) {
    if (!canWriteAttendance) return;
    if (!confirm("Vymazať označenia pre tento tréning?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("training_id", trainingId);

    if (error) return alert(error.message);

    setAttendance((prev) => prev.filter((a) => a.training_id !== trainingId));
  }

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Načítavam prezenčku...
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš oprávnenie vidieť túto prezenčku.
        </div>
      </div>
    );
  }

  if (!dojo) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        Dojo sa nenašlo.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <CalendarCheck size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Mesačná prezenčka
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {dojo.name}
          </h1>

          <p className="mt-2 max-w-2xl text-white/65">
            {dojo.address || "Bez adresy"}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Žiaci</p>
              <p className="text-3xl font-black">{monthStats.students}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Tréningy</p>
              <p className="text-3xl font-black">{monthStats.trainings}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prítomnosti</p>
              <p className="text-3xl font-black text-green-300">
                {monthStats.present}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Účasť</p>
              <p className="text-3xl font-black">{monthStats.percent}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-black/10">
          <label className="mb-2 block text-sm font-black text-black/55">
            Mesiac
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
          />
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 rounded-[26px] bg-white px-5 py-4 font-black shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <RefreshCcw size={18} />
          Obnoviť
        </button>

        {canCreateTrainings && (
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-[26px] bg-[#d71920] px-5 py-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
          >
            <Sparkles size={18} />
            {showSetup ? "Skryť nastavenia" : "Nastavenia tréningov"}
            <ChevronDown
              size={18}
              className={`transition ${showSetup ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {canCreateTrainings && showSetup && (
        <div className="grid gap-5">
          <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <h2 className="mb-4 text-2xl font-black">Rýchle témy mesiaca</h2>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={bulkTopicId}
                onChange={(e) => setBulkTopicId(e.target.value)}
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              >
                <option value="">Bez témy</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={applyTopicToAllTrainings}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 py-3 font-bold text-white active:scale-[0.98]"
              >
                <CheckCircle2 size={18} />
                Použiť pre všetky
              </button>

              <button
                type="button"
                onClick={copyTopicsFromPreviousMonth}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]"
              >
                <Copy size={18} />
                Kopírovať z minulého mesiaca
              </button>
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <h2 className="mb-4 text-2xl font-black">
              Automaticky vygenerovať tréningy
            </h2>

            <div className="mb-4 flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => toggleGenerateDay(day.value)}
                  className={`rounded-2xl px-4 py-3 font-black active:scale-[0.98] ${
                    generateDays.includes(day.value)
                      ? "bg-[#d71920] text-white"
                      : "bg-black/10 text-black"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={generateTitle}
                onChange={(e) => setGenerateTitle(e.target.value)}
                placeholder="Názov tréningu"
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              />

              <select
                value={generateTopicId}
                onChange={(e) => setGenerateTopicId(e.target.value)}
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              >
                <option value="">Bez témy</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={generateTrainings}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]"
              >
                <Sparkles size={18} />
                Vygenerovať mesiac
              </button>
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <h2 className="mb-4 text-2xl font-black">Pridať jeden tréning</h2>

            <div className="grid gap-3 md:grid-cols-4">
              <input
                type="date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Názov tréningu"
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              />

              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
              >
                <option value="">Bez témy</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addTraining}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]"
              >
                <Plus size={18} />
                Pridať tréning
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Prezenčka
            </p>
            <h2 className="text-2xl font-black">Mesačný prehľad</h2>
          </div>

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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStudentFilter("visible")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentFilter === "visible"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              <Eye size={18} />
            </button>

            <button
              type="button"
              onClick={() => setStudentFilter("hidden")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentFilter === "hidden"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              <EyeOff size={18} />
            </button>

            <button
              type="button"
              onClick={() => setStudentFilter("all")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentFilter === "all"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {hiddenStudents.length > 0 && (
          <button
            type="button"
            onClick={() => setHiddenStudents([])}
            className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-[#111] px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
          >
            <Eye size={18} />
            Zobraziť všetkých späť
          </button>
        )}

        {trainings.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-6 text-center">
            V tomto mesiaci ešte nie sú zadané tréningy.
          </p>
        ) : filteredStudents.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-6 text-center">
            Nenašli sa žiadni žiaci pre tento filter.
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="min-w-max border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 min-w-[210px] border-b bg-white p-3 text-left sm:min-w-[260px]">
                    <div className="flex items-center gap-2">
                      <Users size={18} />
                      Žiak
                    </div>
                  </th>

                  {trainings.map((training) => (
                    <th
                      key={training.id}
                      className="min-w-[170px] border-b p-3 text-center"
                    >
                      <div
                        className={`rounded-3xl border p-3 space-y-2 shadow-sm ${topicColor(
                          training.topic_id
                        )}`}
                      >
                        <p className="text-lg font-black">
                          {formatDate(training.training_date)}
                        </p>
                        <p className="text-xs font-bold text-black/45">
                          {formatLongDate(training.training_date)}
                        </p>

                        {canCreateTrainings ? (
                          <select
                            value={training.topic_id || ""}
                            onChange={(e) =>
                              updateTrainingTopic(training.id, e.target.value)
                            }
                            className="w-full rounded-xl border bg-white px-2 py-2 text-xs font-bold"
                          >
                            <option value="">Bez témy</option>
                            {topics.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs font-bold">
                            {training.training_topics?.name || "Bez témy"}
                          </p>
                        )}

                        {canWriteAttendance && (
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => markAll(training.id, "present")}
                              className="rounded-xl bg-green-600 px-2 py-2 text-xs font-black text-white"
                            >
                              ✓
                            </button>

                            <button
                              type="button"
                              onClick={() => markAll(training.id, "absent")}
                              className="rounded-xl bg-red-600 px-2 py-2 text-xs font-black text-white"
                            >
                              ✕
                            </button>

                            <button
                              type="button"
                              onClick={() => clearTraining(training.id)}
                              className="rounded-xl bg-black/20 px-2 py-2 text-xs font-black text-black"
                            >
                              ↺
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const hidden = hiddenStudents.includes(student.id);

                  return (
                    <tr key={student.id} className={hidden ? "opacity-45" : ""}>
                      <td className="sticky left-0 z-20 min-w-[210px] border-b bg-white p-3 shadow-[8px_0_12px_-12px_rgba(0,0,0,0.5)] sm:min-w-[260px]">
                        <p className="font-black leading-tight">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-black/55">
                          {student.technical_grade || "Bez stupňa"}
                        </p>

                        {canWriteAttendance && (
                          <button
                            type="button"
                            onClick={() =>
                              setHiddenStudents((prev) =>
                                prev.includes(student.id)
                                  ? prev.filter((id) => id !== student.id)
                                  : [...prev, student.id]
                              )
                            }
                            className={`mt-2 rounded-xl px-3 py-1 text-xs font-black ${
                              hidden
                                ? "bg-green-100 text-green-800"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {hidden ? "Vrátiť" : "Skryť"}
                          </button>
                        )}
                      </td>

                      {trainings.map((training) => {
                        const status = getAttendance(training.id, student.id);

                        return (
                          <td
                            key={training.id}
                            className="border-b p-3 text-center"
                          >
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                disabled={!canWriteAttendance || hidden}
                                onClick={() =>
                                  setAttendanceStatus(
                                    training.id,
                                    student.id,
                                    "present"
                                  )
                                }
                                className={`flex h-11 items-center justify-center rounded-xl text-white disabled:opacity-40 ${
                                  status === "present"
                                    ? "bg-green-600"
                                    : "bg-black/15"
                                }`}
                              >
                                <Check size={18} />
                              </button>

                              <button
                                type="button"
                                disabled={!canWriteAttendance || hidden}
                                onClick={() =>
                                  setAttendanceStatus(
                                    training.id,
                                    student.id,
                                    "absent"
                                  )
                                }
                                className={`flex h-11 items-center justify-center rounded-xl text-white disabled:opacity-40 ${
                                  status === "absent"
                                    ? "bg-red-600"
                                    : "bg-black/15"
                                }`}
                              >
                                <X size={18} />
                              </button>

                              <button
                                type="button"
                                disabled={!canWriteAttendance || hidden}
                                onClick={() =>
                                  setAttendanceStatus(training.id, student.id, null)
                                }
                                className={`flex h-11 items-center justify-center rounded-xl disabled:opacity-40 ${
                                  status === null
                                    ? "bg-[#111] text-white"
                                    : "bg-black/10 text-black"
                                }`}
                              >
                                <XCircle size={18} />
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={!canWriteAttendance || hidden}
                              onClick={() =>
                                cycleAttendance(training.id, student.id)
                              }
                              className="mt-1 text-[10px] font-bold text-black/35 disabled:opacity-40"
                            >
                              cyklus
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link
        href={`/dojos/${params.id}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-4 text-center font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        Späť do dojo
      </Link>
    </div>
  );
}
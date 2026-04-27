"use client";

import { createClient } from "@/lib/supabase/browser";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Status = "present" | "absent" | null;

const weekDays = [
  { value: 1, label: "Po" },
  { value: 2, label: "Ut" },
  { value: 3, label: "St" },
  { value: 4, label: "Št" },
  { value: 5, label: "Pi" },
  { value: 6, label: "So" },
  { value: 0, label: "Ne" },
];

export default function AttendancePage({ params }: { params: { id: string } }) {
  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [trainingDate, setTrainingDate] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("Tréning");

  const [generateDays, setGenerateDays] = useState<number[]>([1, 3]);
  const [generateTopicId, setGenerateTopicId] = useState("");
  const [generateTitle, setGenerateTitle] = useState("Tréning");

  const monthStart = `${selectedMonth}-01`;

  const monthEnd = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }, [selectedMonth]);

  async function loadData() {
    const supabase = createClient();

    const dojoResult = await supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .single();

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

    const attendanceResult = await supabase.from("attendance").select("*");

    const blackoutResult = await supabase
      .from("training_blackout_dates")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    if (dojoResult.error) console.error(dojoResult.error);
    if (studentsResult.error) console.error(studentsResult.error);
    if (topicsResult.error) console.error(topicsResult.error);
    if (trainingsResult.error) console.error(trainingsResult.error);
    if (attendanceResult.error) console.error(attendanceResult.error);
    if (blackoutResult.error) console.error(blackoutResult.error);

    setDojo(dojoResult.data);
    setStudents(studentsResult.data || []);
    setTopics(topicsResult.data || []);
    setTrainings(trainingsResult.data || []);
    setAttendance(attendanceResult.data || []);
    setBlackouts(blackoutResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, [params.id, selectedMonth]);

  async function addTraining() {
    if (!trainingDate) {
      alert("Vyber dátum tréningu.");
      return;
    }

    const blackout = blackouts.find((b) => b.date === trainingDate);
    if (blackout && !confirm(`Tento dátum je označený ako: ${blackout.reason}. Chceš tréning aj tak pridať?`)) {
      return;
    }

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

    if (error) {
      alert(error.message);
      return;
    }

    setTrainingDate("");
    setTopicId("");
    setTitle("Tréning");
    loadData();
  }

  async function generateTrainings() {
    if (generateDays.length === 0) {
      alert("Vyber aspoň jeden deň v týždni.");
      return;
    }

    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    const blackoutMap = new Map(blackouts.map((b) => [b.date, b.reason]));
    const rows: any[] = [];
    const skipped: string[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();

      if (!generateDays.includes(weekday)) continue;

      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

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
      alert("Nenašli sa žiadne tréningové dátumy v tomto mesiaci.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("trainings").upsert(rows, {
      onConflict: "dojo_id,training_date",
    });

    if (error) {
      alert(error.message);
      return;
    }

    let message = `Vygenerované tréningy: ${rows.length}`;
    if (skipped.length > 0) {
      message += `\n\nPreskočené dni:\n${skipped.join("\n")}`;
    }

    alert(message);
    loadData();
  }

  function toggleGenerateDay(day: number) {
    setGenerateDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
    );
  }

  function getAttendance(trainingId: string, studentId: string): Status {
    return (
      attendance.find(
        (a) => a.training_id === trainingId && a.student_id === studentId
      )?.status || null
    );
  }

  async function cycleAttendance(trainingId: string, studentId: string) {
    const supabase = createClient();
    const current = getAttendance(trainingId, studentId);

    if (!current) {
      const { error } = await supabase.from("attendance").upsert(
        { training_id: trainingId, student_id: studentId, status: "present" },
        { onConflict: "training_id,student_id" }
      );
      if (error) return alert(error.message);
    }

    if (current === "present") {
      const { error } = await supabase.from("attendance").upsert(
        { training_id: trainingId, student_id: studentId, status: "absent" },
        { onConflict: "training_id,student_id" }
      );
      if (error) return alert(error.message);
    }

    if (current === "absent") {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("training_id", trainingId)
        .eq("student_id", studentId);

      if (error) return alert(error.message);
    }

    loadData();
  }

  function formatDate(date: string) {
    const d = new Date(date);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  }

  if (!dojo) return <p>Načítavam...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Mesačná prezenčka</p>
        <h1 className="text-3xl font-bold">{dojo.name}</h1>
        <p className="mt-2 text-white/70">{dojo.address}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Mesiac</h2>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-xl border px-4 py-3"
        />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Automaticky vygenerovať tréningy</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {weekDays.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleGenerateDay(day.value)}
              className={`rounded-xl px-4 py-2 font-bold ${
                generateDays.includes(day.value)
                  ? "bg-brand-red text-white"
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
            className="rounded-xl border px-4 py-3"
          />

          <select
            value={generateTopicId}
            onChange={(e) => setGenerateTopicId(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Bez témy</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>

          <button
            onClick={generateTrainings}
            className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
          >
            Vygenerovať mesiac
          </button>
        </div>

        <p className="mt-3 text-sm text-black/60">
          Generovanie preskočí sviatky a prázdniny uložené v databáze.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Pridať jeden tréning ručne</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={trainingDate}
            onChange={(e) => setTrainingDate(e.target.value)}
            className="rounded-xl border px-4 py-3"
          />

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Názov tréningu"
            className="rounded-xl border px-4 py-3"
          />

          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Bez témy</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>

          <button
            onClick={addTraining}
            className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
          >
            + Pridať tréning
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Prezenčka za mesiac</h2>

        {trainings.length === 0 ? (
          <p className="rounded-2xl bg-brand-cream p-6 text-center">
            V tomto mesiaci ešte nie sú zadané tréningy.
          </p>
        ) : students.length === 0 ? (
          <p className="rounded-2xl bg-brand-cream p-6 text-center">
            V tomto dojo ešte nie sú žiadni žiaci.
          </p>
        ) : (
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white p-3 text-left">
                  Žiak
                </th>

                {trainings.map((training) => (
                  <th key={training.id} className="min-w-[120px] p-3 text-center">
                    <div className="rounded-2xl bg-brand-cream p-3">
                      <p className="text-sm font-bold">
                        {training.training_topics?.name || "Bez témy"}
                      </p>
                      <p className="text-lg font-black">
                        {formatDate(training.training_date)}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="sticky left-0 z-10 border-t bg-white p-3">
                    <p className="font-bold">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-sm text-black/60">
                      {student.technical_grade || "Bez stupňa"}
                    </p>
                  </td>

                  {trainings.map((training) => {
                    const status = getAttendance(training.id, student.id);

                    return (
                      <td key={training.id} className="border-t p-3 text-center">
                        <button
                          onClick={() => cycleAttendance(training.id, student.id)}
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-white transition ${
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
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link
        href={`/dojos/${params.id}`}
        className="inline-block rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
      >
        Späť do dojo
      </Link>
    </div>
  );
}

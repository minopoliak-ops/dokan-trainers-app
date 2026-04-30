"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const eventTypeLabels: Record<string, string> = {
  training: "Tréning",
  kids_seminar: "Detský seminár",
  older_seminar: "Seminár pre starších",
  day_camp: "Denný tábor",
  sleepover_camp_1: "Prespávací tábor 1",
  sleepover_camp_2: "Prespávací tábor 2",
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${month}.${year}`;
}

function AttendanceGraph({
  oldMonth,
  newMonth,
}: {
  oldMonth: { label: string; present: number; absent: number };
  newMonth: { label: string; present: number; absent: number };
}) {
  const maxValue = Math.max(
    oldMonth.present,
    oldMonth.absent,
    newMonth.present,
    newMonth.absent,
    1
  );

  const chartWidth = 420;
  const leftX = 90;
  const rightX = 330;
  const topY = 20;
  const bottomY = 105;

  function getY(value: number) {
    return bottomY - (value / maxValue) * (bottomY - topY);
  }

  const oldPresentY = getY(oldMonth.present);
  const oldAbsentY = getY(oldMonth.absent);
  const newPresentY = getY(newMonth.present);
  const newAbsentY = getY(newMonth.absent);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Porovnanie mesiacov</h2>
          <p className="text-black/60">
            Červená = predchádzajúci mesiac, zelená = najnovší mesiac.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-xl bg-red-100 px-3 py-2 font-bold text-red-800">
            {oldMonth.label}
          </span>
          <span className="rounded-xl bg-green-100 px-3 py-2 font-bold text-green-800">
            {newMonth.label}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} 170`}
        className="mx-auto block w-full max-w-2xl"
      >
        <line x1="55" y1={bottomY} x2="370" y2={bottomY} stroke="#e5e5e5" />
        <line x1="55" y1={topY} x2="55" y2={bottomY} stroke="#e5e5e5" />

        <text x={leftX} y="145" textAnchor="middle" fontSize="14">
          Prítomný
        </text>
        <text x={rightX} y="145" textAnchor="middle" fontSize="14">
          Neprítomný
        </text>

        <polyline
          points={`${leftX},${oldPresentY} ${rightX},${oldAbsentY}`}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={`${leftX},${newPresentY} ${rightX},${newAbsentY}`}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={leftX} cy={oldPresentY} r="5" fill="#dc2626" />
        <circle cx={rightX} cy={oldAbsentY} r="5" fill="#dc2626" />
        <circle cx={leftX} cy={newPresentY} r="5" fill="#16a34a" />
        <circle cx={rightX} cy={newAbsentY} r="5" fill="#16a34a" />

        <text
          x={leftX}
          y={oldPresentY - 10}
          textAnchor="middle"
          fontSize="13"
          fill="#dc2626"
        >
          {oldMonth.present}
        </text>
        <text
          x={rightX}
          y={oldAbsentY - 10}
          textAnchor="middle"
          fontSize="13"
          fill="#dc2626"
        >
          {oldMonth.absent}
        </text>
        <text
          x={leftX}
          y={newPresentY - 10}
          textAnchor="middle"
          fontSize="13"
          fill="#16a34a"
        >
          {newMonth.present}
        </text>
        <text
          x={rightX}
          y={newAbsentY - 10}
          textAnchor="middle"
          fontSize="13"
          fill="#16a34a"
        >
          {newMonth.absent}
        </text>
      </svg>
    </div>
  );
}

export default function StatsPage() {
  const { permissions } = usePermissions();
  const isAdmin = !!permissions?.can_manage_trainers;

  const [dojos, setDojos] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventAttendance, setEventAttendance] = useState<any[]>([]);

  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  async function loadData() {
    if (!permissions) return;

    const supabase = createClient();

    let allowedDojoIds: string[] = [];

    if (!isAdmin) {
      const { data: links } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", permissions.id);

      allowedDojoIds = (links || []).map((l: any) => l.dojo_id);

      if (allowedDojoIds.length === 0) {
        setDojos([]);
        setStudents([]);
        setTrainings([]);
        setAttendance([]);
        setEvents([]);
        setEventAttendance([]);
        return;
      }
    }

    let dojosQuery = supabase.from("dojos").select("*").order("name");

    let studentsQuery = supabase
      .from("students")
      .select("*, dojos(name)")
      .eq("active", true)
      .order("last_name");

    let trainingsQuery = supabase
      .from("trainings")
      .select("*, dojos(name), training_topics(name)")
      .order("training_date", { ascending: false });

    let eventsQuery = supabase
      .from("events")
      .select("*, dojos(name), training_topics(name)")
      .order("start_date", { ascending: false });

    if (!isAdmin) {
      dojosQuery = dojosQuery.in("id", allowedDojoIds);
      studentsQuery = studentsQuery.in("dojo_id", allowedDojoIds);
      trainingsQuery = trainingsQuery.in("dojo_id", allowedDojoIds);
      eventsQuery = eventsQuery.in("dojo_id", allowedDojoIds);
    }

    const [dojosResult, studentsResult, trainingsResult, eventsResult] =
      await Promise.all([dojosQuery, studentsQuery, trainingsQuery, eventsQuery]);

    const trainingIds = (trainingsResult.data || []).map((t: any) => t.id);
    const eventIds = (eventsResult.data || []).map((e: any) => e.id);

    const attendanceResult =
      trainingIds.length > 0
        ? await supabase
            .from("attendance")
            .select("*")
            .in("training_id", trainingIds)
        : { data: [], error: null };

    const eventAttendanceResult =
      eventIds.length > 0
        ? await supabase
            .from("event_attendance")
            .select("*")
            .in("event_id", eventIds)
        : { data: [], error: null };

    if (dojosResult.error) alert(dojosResult.error.message);
    if (studentsResult.error) alert(studentsResult.error.message);
    if (trainingsResult.error) alert(trainingsResult.error.message);
    if (eventsResult.error) console.error(eventsResult.error.message);
    if (attendanceResult.error) alert(attendanceResult.error.message);
    if (eventAttendanceResult.error)
      console.error(eventAttendanceResult.error.message);

    setDojos(dojosResult.data || []);
    setStudents(studentsResult.data || []);
    setTrainings(trainingsResult.data || []);
    setAttendance(attendanceResult.data || []);
    setEvents(eventsResult.data || []);
    setEventAttendance(eventAttendanceResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, [permissions]);

  const filteredStudents = useMemo(() => {
    if (!selectedDojoId) return students;
    return students.filter((s) => s.dojo_id === selectedDojoId);
  }, [students, selectedDojoId]);

  const dojoStats = useMemo(() => {
    return dojos.map((dojo) => {
      const dojoTrainings = trainings.filter((t) => t.dojo_id === dojo.id);
      const dojoTrainingIds = dojoTrainings.map((t) => t.id);

      const dojoAttendance = attendance.filter((a) =>
        dojoTrainingIds.includes(a.training_id)
      );

      const present = dojoAttendance.filter(
        (a) => a.status === "present"
      ).length;
      const absent = dojoAttendance.filter((a) => a.status === "absent").length;

      const topics = new Set(
        dojoTrainings.map((t) => t.training_topics?.name).filter(Boolean)
      );

      const dojoEvents = events.filter((e) => e.dojo_id === dojo.id);
      const eventIds = dojoEvents.map((e) => e.id);
      const eventAtt = eventAttendance.filter((a) =>
        eventIds.includes(a.event_id)
      );
      const eventPresent = eventAtt.filter(
        (a) => a.status === "present"
      ).length;

      return {
        dojo,
        trainingsCount: dojoTrainings.length,
        present,
        absent,
        topicsCount: topics.size,
        eventsCount: dojoEvents.length,
        eventPresent,
      };
    });
  }, [dojos, trainings, attendance, events, eventAttendance]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const studentTrainingAttendance = useMemo(() => {
    if (!selectedStudentId) return [];

    return attendance
      .filter((a) => a.student_id === selectedStudentId)
      .map((a) => ({
        ...a,
        training: trainings.find((t) => t.id === a.training_id),
        type: "training",
      }))
      .filter((a) => a.training)
      .sort((a, b) =>
        String(b.training?.training_date).localeCompare(
          String(a.training?.training_date)
        )
      );
  }, [attendance, trainings, selectedStudentId]);

  const studentEventAttendance = useMemo(() => {
    if (!selectedStudentId) return [];

    return eventAttendance
      .filter((a) => a.student_id === selectedStudentId)
      .map((a) => ({
        ...a,
        event: events.find((e) => e.id === a.event_id),
      }))
      .filter((a) => a.event)
      .sort((a, b) =>
        String(b.event?.start_date).localeCompare(String(a.event?.start_date))
      );
  }, [eventAttendance, events, selectedStudentId]);

  const presentCount = studentTrainingAttendance.filter(
    (a) => a.status === "present"
  ).length;
  const absentCount = studentTrainingAttendance.filter(
    (a) => a.status === "absent"
  ).length;
  const totalCount = studentTrainingAttendance.length;
  const percent =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const eventPresentCount = studentEventAttendance.filter(
    (a) => a.status === "present"
  ).length;
  const eventAbsentCount = studentEventAttendance.filter(
    (a) => a.status === "absent"
  ).length;

  const topicStats = useMemo(() => {
    const map: Record<string, { present: number; absent: number }> = {};

    studentTrainingAttendance.forEach((a) => {
      const topic = a.training?.training_topics?.name || "Bez témy";
      if (!map[topic]) map[topic] = { present: 0, absent: 0 };

      if (a.status === "present") map[topic].present++;
      if (a.status === "absent") map[topic].absent++;
    });

    return Object.entries(map);
  }, [studentTrainingAttendance]);

  const eventTypeStats = useMemo(() => {
    const map: Record<string, { present: number; absent: number }> = {};

    studentEventAttendance.forEach((a) => {
      const type = a.event?.event_type || "unknown";
      const label = eventTypeLabels[type] || type;

      if (!map[label]) map[label] = { present: 0, absent: 0 };

      if (a.status === "present") map[label].present++;
      if (a.status === "absent") map[label].absent++;
    });

    return Object.entries(map);
  }, [studentEventAttendance]);

  const monthComparison = useMemo(() => {
    const map: Record<string, { present: number; absent: number }> = {};

    studentTrainingAttendance.forEach((a) => {
      const date = a.training?.training_date;
      if (!date) return;

      const key = monthKey(date);
      if (!map[key]) map[key] = { present: 0, absent: 0 };

      if (a.status === "present") map[key].present++;
      if (a.status === "absent") map[key].absent++;
    });

    const months = Object.keys(map).sort();
    if (months.length === 0) return null;

    const newestKey = months[months.length - 1];
    const oldKey = months.length > 1 ? months[months.length - 2] : newestKey;

    return {
      oldMonth: {
        label: monthLabel(oldKey),
        present: map[oldKey].present,
        absent: map[oldKey].absent,
      },
      newMonth: {
        label: monthLabel(newestKey),
        present: map[newestKey].present,
        absent: map[newestKey].absent,
      },
    };
  }, [studentTrainingAttendance]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Štatistiky</h1>
        <p className="mt-2 text-white/70">
          {isAdmin
            ? "Dojo, návštevnosť, témy, tréningy, semináre a tábory."
            : "Štatistiky iba pre tvoje priradené dojo."}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Filter</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={selectedDojoId}
            onChange={(e) => {
              setSelectedDojoId(e.target.value);
              setSelectedStudentId("");
            }}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Všetky dojo</option>
            {dojos.map((dojo) => (
              <option key={dojo.id} value={dojo.id}>
                {dojo.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Vyber cvičiaceho</option>
            {filteredStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.last_name} {student.first_name} — {student.dojos?.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dojoStats
          .filter((stat) => !selectedDojoId || stat.dojo.id === selectedDojoId)
          .map((stat) => (
            <div
              key={stat.dojo.id}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
            >
              <p className="text-black/60">Dojo</p>
              <h2 className="text-xl font-bold">{stat.dojo.name}</h2>

              <div className="mt-4 grid gap-2 text-sm">
                <p>
                  Tréningy: <b>{stat.trainingsCount}</b>
                </p>
                <p className="text-green-700">
                  Prítomnosti: <b>{stat.present}</b>
                </p>
                <p className="text-red-700">
                  Neprítomnosti: <b>{stat.absent}</b>
                </p>
                <p>
                  Prebrané témy: <b>{stat.topicsCount}</b>
                </p>
                <p>
                  Semináre/tábory: <b>{stat.eventsCount}</b>
                </p>
                <p>
                  Účasť semináre/tábory: <b>{stat.eventPresent}</b>
                </p>
              </div>
            </div>
          ))}
      </div>

      {selectedStudent && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:col-span-2">
              <p className="text-black/60">Cvičiaci</p>
              <h2 className="text-2xl font-bold">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </h2>
              <p className="text-black/60">
                {selectedStudent.technical_grade || "Bez stupňa"} ·{" "}
                {selectedStudent.dojos?.name}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
              <p className="text-black/60">Tréningy prítomný</p>
              <h2 className="text-4xl font-black text-green-700">
                {presentCount}
              </h2>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
              <p className="text-black/60">Tréningy neprítomný</p>
              <h2 className="text-4xl font-black text-red-700">
                {absentCount}
              </h2>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
              <p className="text-black/60">Účasť tréningy</p>
              <h2 className="text-4xl font-black">{percent}%</h2>
            </div>
          </div>

          {monthComparison && (
            <AttendanceGraph
              oldMonth={monthComparison.oldMonth}
              newMonth={monthComparison.newMonth}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
              <h2 className="mb-4 text-2xl font-bold">Témy tréningov</h2>

              {topicStats.length === 0 ? (
                <p>Zatiaľ nemá dochádzku na tréningoch.</p>
              ) : (
                <div className="grid gap-3">
                  {topicStats.map(([topic, stat]) => (
                    <div
                      key={topic}
                      className="rounded-2xl border border-black/10 p-4"
                    >
                      <p className="text-lg font-bold">{topic}</p>
                      <p className="text-green-700">
                        Prítomný: {stat.present}
                      </p>
                      <p className="text-red-700">
                        Neprítomný: {stat.absent}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
              <h2 className="mb-4 text-2xl font-bold">Semináre a tábory</h2>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="font-bold text-green-800">Prítomný</p>
                  <p className="text-3xl font-black text-green-700">
                    {eventPresentCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="font-bold text-red-800">Neprítomný</p>
                  <p className="text-3xl font-black text-red-700">
                    {eventAbsentCount}
                  </p>
                </div>
              </div>

              {eventTypeStats.length === 0 ? (
                <p>Zatiaľ nemá semináre alebo tábory.</p>
              ) : (
                <div className="grid gap-3">
                  {eventTypeStats.map(([type, stat]) => (
                    <div
                      key={type}
                      className="rounded-2xl border border-black/10 p-4"
                    >
                      <p className="font-bold">{type}</p>
                      <p className="text-green-700">
                        Prítomný: {stat.present}
                      </p>
                      <p className="text-red-700">
                        Neprítomný: {stat.absent}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
            <h2 className="mb-4 text-2xl font-bold">História tréningov</h2>

            <div className="grid gap-3">
              {studentTrainingAttendance.length === 0 ? (
                <p>Žiadna história tréningov.</p>
              ) : (
                studentTrainingAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-black/10 p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {item.training?.training_date} — {item.training?.title}
                      </p>
                      <p className="text-black/60">
                        {item.training?.dojos?.name} ·{" "}
                        {item.training?.training_topics?.name || "Bez témy"}
                      </p>
                    </div>

                    <span
                      className={`rounded-xl px-4 py-2 font-bold ${
                        item.status === "present"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status === "present" ? "Prítomný" : "Neprítomný"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
            <h2 className="mb-4 text-2xl font-bold">
              História seminárov a táborov
            </h2>

            <div className="grid gap-3">
              {studentEventAttendance.length === 0 ? (
                <p>Žiadna história seminárov alebo táborov.</p>
              ) : (
                studentEventAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-black/10 p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {item.event?.start_date} — {item.event?.name}
                      </p>
                      <p className="text-black/60">
                        {eventTypeLabels[item.event?.event_type] ||
                          item.event?.event_type}{" "}
                        · {item.event?.dojos?.name || "Bez dojo"} ·{" "}
                        {item.event?.training_topics?.name || "Bez témy"}
                      </p>
                    </div>

                    <span
                      className={`rounded-xl px-4 py-2 font-bold ${
                        item.status === "present"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status === "present" ? "Prítomný" : "Neprítomný"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href={`/students/${selectedStudent.id}`}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#d71920] px-4 py-4 text-center font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
          >
            Otvoriť profil cvičiaceho
          </Link>
        </>
      )}
    </div>
  );
}
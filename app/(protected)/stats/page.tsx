"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
Archive,
BarChart3,
ChevronDown,
ChevronUp,
Download,
Filter,
Search,
ShieldAlert,
Trash2,
UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
CartesianGrid,
Legend,
Line,
LineChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

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

function statusLabel(status: string) {
return status === "present" ? "Prítomný" : "Neprítomný";
}

function currentMonthStart() {
const d = new Date();
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function previousMonthEnd() {
const d = new Date();
return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
}

function juneEndDefault() {
const d = new Date();
return `${d.getFullYear()}-06-30`;
}

function safeArchiveDeleteDate(archiveUntil: string) {
const prevEnd = previousMonthEnd();
if (!archiveUntil) return prevEnd;
return archiveUntil > prevEnd ? prevEnd : archiveUntil;
}

function downloadJson(filename: string, data: any) {
const blob = new Blob([JSON.stringify(data, null, 2)], {
type: "application/json",
});

const url = URL.createObjectURL(blob);
const a = document.createElement("a");

a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();

a.remove();
URL.revokeObjectURL(url);
}

function AttendanceGraph({
oldMonth,
newMonth,
}: {
oldMonth: { label: string; present: number; absent: number };
newMonth: { label: string; present: number; absent: number };
}) {
const data = [
{
type: "Prítomný",
[oldMonth.label]: oldMonth.present,
[newMonth.label]: newMonth.present,
},
{
type: "Neprítomný",
[oldMonth.label]: oldMonth.absent,
[newMonth.label]: newMonth.absent,
},
];

return (
<div className="min-w-0 overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-6">
<div className="mb-4">
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Graf
</p>
<h2 className="text-2xl font-black">Porovnanie mesiacov</h2>
<p className="mt-1 text-sm text-black/55">
Dochádzka vybraného cvičiaceho za posledné mesiace.
</p>
</div>

<div className="h-[280px] min-w-0">
<ResponsiveContainer width="100%" height="100%">
<LineChart data={data}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="type" />
<YAxis allowDecimals={false} />
<Tooltip />
<Legend />
<Line
type="monotone"
dataKey={oldMonth.label}
stroke="#dc2626"
strokeWidth={3}
dot={{ r: 5 }}
activeDot={{ r: 7 }}
/>
<Line
type="monotone"
dataKey={newMonth.label}
stroke="#16a34a"
strokeWidth={3}
dot={{ r: 5 }}
activeDot={{ r: 7 }}
/>
</LineChart>
</ResponsiveContainer>
</div>
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
const [loading, setLoading] = useState(true);

const [selectedDojoId, setSelectedDojoId] = useState("");
const [selectedStudentId, setSelectedStudentId] = useState("");

const [showTrainingHistory, setShowTrainingHistory] = useState(false);
const [showEventHistory, setShowEventHistory] = useState(false);
const [trainingSearch, setTrainingSearch] = useState("");
const [eventSearch, setEventSearch] = useState("");

const [archiveUntil, setArchiveUntil] = useState(juneEndDefault());
const [archiveDownloaded, setArchiveDownloaded] = useState(false);
const [archiveWorking, setArchiveWorking] = useState(false);

async function loadData() {
if (!permissions) return;

setLoading(true);

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
setLoading(false);
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
? await supabase.from("attendance").select("*").in("training_id", trainingIds)
: { data: [], error: null };

const eventAttendanceResult =
eventIds.length > 0
? await supabase.from("event_attendance").select("*").in("event_id", eventIds)
: { data: [], error: null };

if (dojosResult.error) alert(dojosResult.error.message);
if (studentsResult.error) alert(studentsResult.error.message);
if (trainingsResult.error) alert(trainingsResult.error.message);
if (eventsResult.error) console.error(eventsResult.error.message);
if (attendanceResult.error) alert(attendanceResult.error.message);
if (eventAttendanceResult.error) console.error(eventAttendanceResult.error.message);

setDojos(dojosResult.data || []);
setStudents(studentsResult.data || []);
setTrainings(trainingsResult.data || []);
setAttendance(attendanceResult.data || []);
setEvents(eventsResult.data || []);
setEventAttendance(eventAttendanceResult.data || []);
setLoading(false);
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

const present = dojoAttendance.filter((a) => a.status === "present").length;
const absent = dojoAttendance.filter((a) => a.status === "absent").length;

const topics = new Set(
dojoTrainings.map((t) => t.training_topics?.name).filter(Boolean)
);

const dojoEvents = events.filter((e) => e.dojo_id === dojo.id);
const eventIds = dojoEvents.map((e) => e.id);
const eventAtt = eventAttendance.filter((a) => eventIds.includes(a.event_id));
const eventPresent = eventAtt.filter((a) => a.status === "present").length;

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

const filteredTrainingHistory = useMemo(() => {
const q = trainingSearch.toLowerCase().trim();
if (!q) return studentTrainingAttendance;

return studentTrainingAttendance.filter((item) => {
const text = [
item.training?.training_date,
item.training?.title,
item.training?.dojos?.name,
item.training?.training_topics?.name,
statusLabel(item.status),
]
.filter(Boolean)
.join(" ")
.toLowerCase();

return text.includes(q);
});
}, [studentTrainingAttendance, trainingSearch]);

const filteredEventHistory = useMemo(() => {
const q = eventSearch.toLowerCase().trim();
if (!q) return studentEventAttendance;

return studentEventAttendance.filter((item) => {
const typeLabel =
eventTypeLabels[item.event?.event_type] || item.event?.event_type || "";

const text = [
item.event?.start_date,
item.event?.name,
typeLabel,
item.event?.dojos?.name,
item.event?.training_topics?.name,
statusLabel(item.status),
]
.filter(Boolean)
.join(" ")
.toLowerCase();

return text.includes(q);
});
}, [studentEventAttendance, eventSearch]);

const presentCount = studentTrainingAttendance.filter(
(a) => a.status === "present"
).length;

const absentCount = studentTrainingAttendance.filter(
(a) => a.status === "absent"
).length;

const totalCount = studentTrainingAttendance.length;
const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

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

const archiveDeleteUntil = safeArchiveDeleteDate(archiveUntil);
const currentMonth = currentMonthStart();

const archiveTrainings = useMemo(() => {
return trainings.filter((t) => t.training_date <= archiveDeleteUntil);
}, [trainings, archiveDeleteUntil]);

const archiveTrainingIds = useMemo(
() => archiveTrainings.map((t) => t.id),
[archiveTrainings]
);

const archiveAttendance = useMemo(() => {
return attendance.filter((a) => archiveTrainingIds.includes(a.training_id));
}, [attendance, archiveTrainingIds]);

const archiveEvents = useMemo(() => {
return events.filter((e) => e.start_date <= archiveDeleteUntil);
}, [events, archiveDeleteUntil]);

const archiveEventIds = useMemo(
() => archiveEvents.map((e) => e.id),
[archiveEvents]
);

const archiveEventAttendance = useMemo(() => {
return eventAttendance.filter((a) => archiveEventIds.includes(a.event_id));
}, [eventAttendance, archiveEventIds]);

function exportArchive() {
if (!isAdmin) return;

const archive = {
created_at: new Date().toISOString(),
archive_until_requested: archiveUntil,
archive_until_used: archiveDeleteUntil,
current_month_locked_from: currentMonth,
note:
"Aktuálny mesiac a budúcnosť sa nemažú. Žiaci, dojo, tréneri a témy zostávajú v systéme.",
dojos,
students,
trainings: archiveTrainings,
attendance: archiveAttendance,
events: archiveEvents,
event_attendance: archiveEventAttendance,
};

downloadJson(`dokan-archive-do-${archiveDeleteUntil}.json`, archive);
setArchiveDownloaded(true);
}

async function deleteArchivedHistory() {
if (!isAdmin) return;

if (!archiveDownloaded) {
alert("Najprv stiahni archív. Až potom sa dá mazať.");
return;
}

if (archiveDeleteUntil >= currentMonth) {
alert("Aktuálny mesiac je zamknutý a nesmie sa vymazať.");
return;
}

if (archiveTrainings.length === 0 && archiveEvents.length === 0) {
alert("Nie je čo vymazať pre zvolený dátum.");
return;
}

const ok = confirm(
`Naozaj vymazať históriu do ${archiveDeleteUntil}?\n\n` +
`Vymažú sa staré tréningy, prezenčka tréningov, semináre/tábory a ich prezenčka.\n` +
`Aktuálny mesiac sa nevymaže. Žiaci, dojo, tréneri a témy zostanú.`
);

if (!ok) return;

setArchiveWorking(true);

const supabase = createClient();

if (archiveTrainingIds.length > 0) {
const { error: attendanceDeleteError } = await supabase
.from("attendance")
.delete()
.in("training_id", archiveTrainingIds);

if (attendanceDeleteError) {
setArchiveWorking(false);
return alert(attendanceDeleteError.message);
}

const { error: trainingsDeleteError } = await supabase
.from("trainings")
.delete()
.in("id", archiveTrainingIds);

if (trainingsDeleteError) {
setArchiveWorking(false);
return alert(trainingsDeleteError.message);
}
}

if (archiveEventIds.length > 0) {
const { error: eventAttendanceDeleteError } = await supabase
.from("event_attendance")
.delete()
.in("event_id", archiveEventIds);

if (eventAttendanceDeleteError) {
setArchiveWorking(false);
return alert(eventAttendanceDeleteError.message);
}

const { error: externalDeleteError } = await supabase
.from("event_external_participants")
.delete()
.in("event_id", archiveEventIds);

if (externalDeleteError) console.error(externalDeleteError.message);

const { error: eventsDeleteError } = await supabase
.from("events")
.delete()
.in("id", archiveEventIds);

if (eventsDeleteError) {
setArchiveWorking(false);
return alert(eventsDeleteError.message);
}
}

setArchiveWorking(false);
setArchiveDownloaded(false);
alert("Archivovaná história bola vymazaná.");
loadData();
}

const selectClass =
"box-border h-[56px] w-full max-w-full min-w-0 appearance-none rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white";

const inputClass =
"box-border h-[56px] w-full max-w-full min-w-0 appearance-none rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white";

const dateInputClass =
"box-border h-[56px] w-full max-w-full min-w-0 appearance-none rounded-2xl border border-black/10 bg-[#f7f2e8] px-3 text-center text-base font-black outline-none focus:border-[#d71920] focus:bg-white sm:px-4";

return (
<div className="min-h-screen space-y-6 overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5">
<div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
<div className="p-6">
<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
<BarChart3 size={28} />
</div>

<p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
DOKAN analytika
</p>

<h1 className="mt-2 text-4xl font-black tracking-tight">Štatistiky</h1>

<p className="mt-3 max-w-2xl text-white/65">
{isAdmin
? "Dojo, návštevnosť, témy, tréningy, semináre, tábory a bezpečný archív sezóny."
: "Štatistiky iba pre tvoje priradené dojo."}
</p>

<div className="mt-6 grid gap-3 md:grid-cols-4">
<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Dojo</p>
<p className="text-3xl font-black">{dojos.length}</p>
</div>

<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Žiaci</p>
<p className="text-3xl font-black">{students.length}</p>
</div>

<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Tréningy</p>
<p className="text-3xl font-black">{trainings.length}</p>
</div>

<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Semináre/tábory</p>
<p className="text-3xl font-black">{events.length}</p>
</div>
</div>
</div>
</div>

{isAdmin && (
<div className="w-full max-w-full overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-6">
<div className="mb-5 flex items-start gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#111] text-white">
<Archive />
</div>

<div className="min-w-0">
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Bezpečná údržba
</p>
<h2 className="text-2xl font-black">Archív sezóny</h2>
<p className="mt-1 text-sm text-black/55">
Najprv stiahni archív. Mazanie sa odomkne až potom. Aktuálny
mesiac je vždy zamknutý.
</p>
</div>
</div>

<div className="grid min-w-0 gap-3 lg:grid-cols-4">
<div className="min-w-0 overflow-hidden lg:col-span-2">
<label className="mb-2 block text-sm font-black text-black/55">
Archivovať do dátumu
</label>

<div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl">
<input
type="date"
value={archiveUntil}
onChange={(e) => {
setArchiveUntil(e.target.value);
setArchiveDownloaded(false);
}}
className={dateInputClass}
/>
</div>
</div>

<div className="min-w-0 rounded-3xl bg-[#f7f2e8] p-4">
<p className="text-sm text-black/60">Bezpečné mazanie do</p>
<p className="mt-1 break-words text-2xl font-black">
{archiveDeleteUntil}
</p>
<p className="mt-1 text-xs text-black/50">
Aktuálny mesiac od {currentMonth} je zamknutý.
</p>
</div>

<div className="min-w-0 rounded-3xl bg-[#f7f2e8] p-4">
<p className="text-sm text-black/60">Na archiváciu</p>
<p className="mt-1 text-sm">
Tréningy: <b>{archiveTrainings.length}</b>
</p>
<p className="text-sm">
Prezenčka: <b>{archiveAttendance.length}</b>
</p>
<p className="text-sm">
Semináre/tábory: <b>{archiveEvents.length}</b>
</p>
</div>
</div>

<div className="mt-4 grid gap-3 md:grid-cols-2">
<button
onClick={exportArchive}
disabled={archiveWorking}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98] disabled:opacity-60"
>
<Download size={20} />
Stiahnuť archív
</button>

<button
onClick={deleteArchivedHistory}
disabled={!archiveDownloaded || archiveWorking}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white active:scale-[0.98] disabled:opacity-40"
>
<Trash2 size={20} />
{archiveWorking
? "Mažem..."
: archiveDownloaded
? "Vymazať archivovanú históriu"
: "Najprv stiahni archív"}
</button>
</div>

{!archiveDownloaded && (
<div className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
<ShieldAlert className="shrink-0" size={20} />
Mazanie je zamknuté, kým nestiahneš archív.
</div>
)}
</div>
)}

<div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-6">
<div className="mb-4 flex items-center gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
<Filter />
</div>

<div>
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Výber
</p>
<h2 className="text-2xl font-black">Filter</h2>
</div>
</div>

<div className="grid gap-3 md:grid-cols-2">
<select
value={selectedDojoId}
onChange={(e) => {
setSelectedDojoId(e.target.value);
setSelectedStudentId("");
}}
className={selectClass}
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
onChange={(e) => {
setSelectedStudentId(e.target.value);
setShowTrainingHistory(false);
setShowEventHistory(false);
setTrainingSearch("");
setEventSearch("");
}}
className={selectClass}
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

{loading ? (
<div className="rounded-3xl bg-white p-6 text-center font-bold text-black/55 shadow-sm">
Načítavam štatistiky...
</div>
) : (
<div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
{dojoStats
.filter((stat) => !selectedDojoId || stat.dojo.id === selectedDojoId)
.map((stat) => (
<div
key={stat.dojo.id}
className="min-w-0 overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10"
>
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Dojo
</p>
<h2 className="mt-1 break-words text-xl font-black">
{stat.dojo.name}
</h2>

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
)}

{selectedStudent && (
<>
<div className="grid min-w-0 gap-4 md:grid-cols-5">
<div className="min-w-0 overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 md:col-span-2">
<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white">
<UserRound />
</div>
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Cvičiaci
</p>
<h2 className="mt-1 break-words text-2xl font-black">
{selectedStudent.first_name} {selectedStudent.last_name}
</h2>
<p className="mt-1 text-sm text-black/55">
{selectedStudent.technical_grade || "Bez stupňa"} ·{" "}
{selectedStudent.dojos?.name}
</p>
</div>

<div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<p className="text-sm text-black/55">Tréningy prítomný</p>
<h2 className="mt-1 text-4xl font-black text-green-700">
{presentCount}
</h2>
</div>

<div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<p className="text-sm text-black/55">Tréningy neprítomný</p>
<h2 className="mt-1 text-4xl font-black text-red-700">
{absentCount}
</h2>
</div>

<div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<p className="text-sm text-black/55">Účasť tréningy</p>
<h2 className="mt-1 text-4xl font-black">{percent}%</h2>
</div>
</div>

{monthComparison && (
<AttendanceGraph
oldMonth={monthComparison.oldMonth}
newMonth={monthComparison.newMonth}
/>
)}

<div className="grid min-w-0 gap-4 md:grid-cols-2">
<div className="min-w-0 overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<h2 className="text-2xl font-black">Témy tréningov</h2>

{topicStats.length === 0 ? (
<p className="mt-4 rounded-2xl bg-[#f7f2e8] p-4 text-black/55">
Zatiaľ nemá dochádzku na tréningoch.
</p>
) : (
<div className="mt-4 grid gap-3">
{topicStats.map(([topic, stat]) => (
<div key={topic} className="rounded-2xl bg-[#f7f2e8] p-4">
<p className="break-words text-lg font-black">{topic}</p>
<p className="mt-2 text-sm text-green-700">
Prítomný: <b>{stat.present}</b>
</p>
<p className="text-sm text-red-700">
Neprítomný: <b>{stat.absent}</b>
</p>
</div>
))}
</div>
)}
</div>

<div className="min-w-0 overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<h2 className="text-2xl font-black">Semináre a tábory</h2>

<div className="mt-4 grid gap-3 sm:grid-cols-2">
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
<p className="mt-4 rounded-2xl bg-[#f7f2e8] p-4 text-black/55">
Zatiaľ nemá semináre alebo tábory.
</p>
) : (
<div className="mt-4 grid gap-3">
{eventTypeStats.map(([type, stat]) => (
<div key={type} className="rounded-2xl bg-[#f7f2e8] p-4">
<p className="break-words font-black">{type}</p>
<p className="mt-2 text-sm text-green-700">
Prítomný: <b>{stat.present}</b>
</p>
<p className="text-sm text-red-700">
Neprítomný: <b>{stat.absent}</b>
</p>
</div>
))}
</div>
)}
</div>
</div>

<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<button
type="button"
onClick={() => setShowTrainingHistory((v) => !v)}
className="flex w-full items-center justify-between gap-4 text-left active:scale-[0.99]"
>
<div className="min-w-0">
<h2 className="text-2xl font-black">História tréningov</h2>
<p className="text-sm text-black/50">
{studentTrainingAttendance.length} záznamov
</p>
</div>

<span className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#111] px-4 py-3 text-sm font-black text-white">
{showTrainingHistory ? "Skryť" : "Rozbaliť"}
{showTrainingHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</span>
</button>

{showTrainingHistory && (
<div className="mt-5 space-y-4">
<div className="relative">
<Search
size={18}
className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
/>
<input
value={trainingSearch}
onChange={(e) => setTrainingSearch(e.target.value)}
placeholder="Vyhľadať podľa dátumu, názvu, témy, dojo..."
className={`${inputClass} pl-11`}
/>
</div>

<div className="grid gap-3">
{filteredTrainingHistory.length === 0 ? (
<p className="rounded-2xl bg-[#f7f2e8] p-4 text-black/55">
Žiadna história tréningov pre tento filter.
</p>
) : (
filteredTrainingHistory.map((item) => (
<div
key={item.id}
className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 sm:flex-row sm:items-center sm:justify-between"
>
<div className="min-w-0">
<p className="break-words font-black">
{item.training?.training_date} — {item.training?.title}
</p>
<p className="break-words text-sm text-black/55">
{item.training?.dojos?.name} ·{" "}
{item.training?.training_topics?.name || "Bez témy"}
</p>
</div>

<span
className={`w-fit shrink-0 rounded-2xl px-4 py-2 text-sm font-black ${
item.status === "present"
? "bg-green-100 text-green-800"
: "bg-red-100 text-red-800"
}`}
>
{statusLabel(item.status)}
</span>
</div>
))
)}
</div>
</div>
)}
</div>

<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<button
type="button"
onClick={() => setShowEventHistory((v) => !v)}
className="flex w-full items-center justify-between gap-4 text-left active:scale-[0.99]"
>
<div className="min-w-0">
<h2 className="text-2xl font-black">
História seminárov a táborov
</h2>
<p className="text-sm text-black/50">
{studentEventAttendance.length} záznamov
</p>
</div>

<span className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#111] px-4 py-3 text-sm font-black text-white">
{showEventHistory ? "Skryť" : "Rozbaliť"}
{showEventHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</span>
</button>

{showEventHistory && (
<div className="mt-5 space-y-4">
<div className="relative">
<Search
size={18}
className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
/>
<input
value={eventSearch}
onChange={(e) => setEventSearch(e.target.value)}
placeholder="Vyhľadať podľa dátumu, názvu, typu, témy, dojo..."
className={`${inputClass} pl-11`}
/>
</div>

<div className="grid gap-3">
{filteredEventHistory.length === 0 ? (
<p className="rounded-2xl bg-[#f7f2e8] p-4 text-black/55">
Žiadna história seminárov alebo táborov pre tento filter.
</p>
) : (
filteredEventHistory.map((item) => (
<div
key={item.id}
className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 sm:flex-row sm:items-center sm:justify-between"
>
<div className="min-w-0">
<p className="break-words font-black">
{item.event?.start_date} — {item.event?.name}
</p>
<p className="break-words text-sm text-black/55">
{eventTypeLabels[item.event?.event_type] ||
item.event?.event_type}{" "}
· {item.event?.dojos?.name || "Bez dojo"} ·{" "}
{item.event?.training_topics?.name || "Bez témy"}
</p>
</div>

<span
className={`w-fit shrink-0 rounded-2xl px-4 py-2 text-sm font-black ${
item.status === "present"
? "bg-green-100 text-green-800"
: "bg-red-100 text-red-800"
}`}
>
{statusLabel(item.status)}
</span>
</div>
))
)}
</div>
</div>
)}
</div>

<Link
href={`/students/${selectedStudent.id}`}
className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 text-center font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
>
<UserRound size={20} />
Otvoriť profil cvičiaceho
</Link>
</>
)}
</div>
);
}

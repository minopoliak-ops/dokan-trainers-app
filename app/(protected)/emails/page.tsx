"use client";

import { createClient } from "@/lib/supabase/browser";
import {
CheckCircle2,
Copy,
Mail,
MessageCircle,
Search,
Send,
Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ADMIN_EMAIL = "mino.poliak@gmail.com";

export default function EmailsPage() {
const [isAdmin, setIsAdmin] = useState(false);
const [dojos, setDojos] = useState<any[]>([]);
const [students, setStudents] = useState<any[]>([]);
const [selectedDojoId, setSelectedDojoId] = useState("");
const [selectedStudentId, setSelectedStudentId] = useState("");
const [target, setTarget] = useState<"student" | "dojo" | "all">("student");
const [mode, setMode] = useState<"visual" | "html">("visual");
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);

const [subject, setSubject] = useState("Správa z DOKAN Bratislava");
const [message, setMessage] = useState(
"Dobrý deň,\n\nposielame informáciu z tréningovej zóny DOKAN Bratislava.\n\nS pozdravom,\nDOKAN Bratislava"
);

useEffect(() => {
async function loadData() {
setLoading(true);

const supabase = createClient();

const { data: userData } = await supabase.auth.getUser();
const email = userData.user?.email || "";

const admin = email === ADMIN_EMAIL;
setIsAdmin(admin);

const { data: trainer } = await supabase
.from("trainers")
.select("*")
.eq("email", email)
.maybeSingle();

if (!trainer && !admin) {
setDojos([]);
setStudents([]);
setLoading(false);
return;
}

if (admin) {
const [dojosRes, studentsRes] = await Promise.all([
supabase.from("dojos").select("*").order("name"),
supabase
.from("students")
.select("*, dojos(name)")
.eq("active", true)
.order("last_name"),
]);

setDojos(dojosRes.data || []);
setStudents(studentsRes.data || []);
setLoading(false);
return;
}

const { data: links } = await supabase
.from("trainer_dojos")
.select("dojo_id")
.eq("trainer_id", trainer.id);

const allowedDojoIds = (links || []).map((l: any) => l.dojo_id);

if (allowedDojoIds.length === 0) {
setDojos([]);
setStudents([]);
setLoading(false);
return;
}

const [dojosRes, studentsRes] = await Promise.all([
supabase
.from("dojos")
.select("*")
.in("id", allowedDojoIds)
.order("name"),
supabase
.from("students")
.select("*, dojos(name)")
.eq("active", true)
.in("dojo_id", allowedDojoIds)
.order("last_name"),
]);

setDojos(dojosRes.data || []);
setStudents(studentsRes.data || []);
setLoading(false);
}

loadData();
}, []);

const filteredStudents = useMemo(() => {
const q = search.toLowerCase().trim();

return students.filter((s) => {
if (!q) return true;

return [
s.first_name,
s.last_name,
s.dojos?.name,
s.parent_email,
s.email,
s.parent_phone,
s.phone,
]
.filter(Boolean)
.join(" ")
.toLowerCase()
.includes(q);
});
}, [students, search]);

const recipients = useMemo(() => {
if (target === "student") {
return students.filter((s) => s.id === selectedStudentId);
}

if (target === "dojo") {
return students.filter((s) => s.dojo_id === selectedDojoId);
}

return students;
}, [students, target, selectedStudentId, selectedDojoId]);

const emailRecipients = useMemo(() => {
return recipients
.map((s) => s.parent_email || s.email)
.filter(Boolean);
}, [recipients]);

const phoneRecipients = useMemo(() => {
return recipients
.map((s) => ({
name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
phone: String(s.parent_phone || s.phone || "").replace(/\s/g, ""),
}))
.filter((s) => s.phone);
}, [recipients]);

const htmlMessage = message
.split("\n")
.map((line) => `<p>${line || "&nbsp;"}</p>`)
.join("\n");

function copy(text: string) {
if (!text) return alert("Nie je čo kopírovať.");

navigator.clipboard.writeText(text);
alert("Skopírované.");
}

function openEmail() {
if (emailRecipients.length === 0) {
return alert("Nie sú dostupné emailové adresy.");
}

window.location.href = `mailto:${emailRecipients.join(
","
)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
message
)}`;
}

function formatPhone(phone: string) {
const cleaned = String(phone || "").replace(/\s/g, "");

if (!cleaned) return "";
if (cleaned.startsWith("+")) return cleaned;

return "+421" + cleaned.replace(/^0/, "");
}

function whatsappLink(phone: string) {
const clean = formatPhone(phone).replace("+", "");
return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

const selectClass =
"h-[56px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white";

const inputClass =
"h-[56px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white";

const textareaClass =
"min-h-[230px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-4 text-[16px] font-semibold leading-relaxed outline-none focus:border-[#d71920] focus:bg-white";

return (
<div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
<div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
<div className="p-6">
<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
<Mail size={28} />
</div>

<p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
Komunikácia
</p>

<h1 className="mt-2 text-4xl font-black tracking-tight">
Emaily rodičom
</h1>

<p className="mt-3 max-w-2xl text-white/65">
Email a WhatsApp správy jednotlivo, podľa dojo alebo všetkým
dostupným kontaktom.
</p>

<div className="mt-6 grid gap-3 md:grid-cols-3">
<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Príjemcovia</p>
<p className="text-3xl font-black">{recipients.length}</p>
</div>

<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">Email adresy</p>
<p className="text-3xl font-black">{emailRecipients.length}</p>
</div>

<div className="rounded-2xl bg-white/10 p-4">
<p className="text-sm text-white/50">WhatsApp čísla</p>
<p className="text-3xl font-black">{phoneRecipients.length}</p>
</div>
</div>
</div>
</div>

<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<div className="mb-4 flex items-center gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
<Users />
</div>

<div className="min-w-0">
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Výber príjemcov
</p>
<h2 className="text-2xl font-black">Komu poslať</h2>
</div>
</div>

<div className="grid gap-3 md:grid-cols-3">
<select
value={target}
onChange={(e) => {
setTarget(e.target.value as "student" | "dojo" | "all");
setSelectedDojoId("");
setSelectedStudentId("");
}}
className={selectClass}
>
<option value="student">Jednotlivec</option>
<option value="dojo">Celé dojo</option>
<option value="all">
{isAdmin ? "Všetky dojo" : "Všetky moje dojo"}
</option>
</select>

{target === "student" && (
<select
value={selectedStudentId}
onChange={(e) => setSelectedStudentId(e.target.value)}
className={`${selectClass} md:col-span-2`}
>
<option value="">Vyber cvičiaceho</option>
{filteredStudents.map((s) => (
<option key={s.id} value={s.id}>
{s.last_name} {s.first_name} — {s.dojos?.name}
</option>
))}
</select>
)}

{target === "dojo" && (
<select
value={selectedDojoId}
onChange={(e) => setSelectedDojoId(e.target.value)}
className={`${selectClass} md:col-span-2`}
>
<option value="">Vyber dojo</option>
{dojos.map((d) => (
<option key={d.id} value={d.id}>
{d.name}
</option>
))}
</select>
)}

{target === "all" && (
<div className="flex min-h-[56px] items-center rounded-2xl bg-[#f7f2e8] px-4 font-bold text-black/65 md:col-span-2">
Vybrané: {isAdmin ? "všetky dojo" : "všetky moje dojo"}
</div>
)}
</div>

<div className="relative mt-3">
<Search
size={18}
className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
/>
<input
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Hľadaj cvičiaceho, dojo, email alebo telefón..."
className={`${inputClass} pl-11`}
/>
</div>

{loading && (
<p className="mt-3 rounded-2xl bg-[#f7f2e8] p-4 text-sm font-bold text-black/55">
Načítavam kontakty...
</p>
)}
</div>

<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Editor
</p>
<h2 className="text-2xl font-black">Editor správy</h2>
</div>

<div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f7f2e8] p-2">
<button
type="button"
onClick={() => setMode("visual")}
className={`rounded-xl px-4 py-3 font-black active:scale-[0.98] ${
mode === "visual" ? "bg-[#d71920] text-white" : "bg-white text-black"
}`}
>
Vizuál
</button>

<button
type="button"
onClick={() => setMode("html")}
className={`rounded-xl px-4 py-3 font-black active:scale-[0.98] ${
mode === "html" ? "bg-[#d71920] text-white" : "bg-white text-black"
}`}
>
HTML kód
</button>
</div>
</div>

<input
value={subject}
onChange={(e) => setSubject(e.target.value)}
placeholder="Predmet emailu"
className={`${inputClass} mb-3`}
/>

{mode === "visual" ? (
<textarea
value={message}
onChange={(e) => setMessage(e.target.value)}
rows={10}
className={textareaClass}
/>
) : (
<textarea
value={htmlMessage}
readOnly
rows={10}
className="min-h-[230px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#111] p-4 font-mono text-sm leading-relaxed text-green-300 outline-none"
/>
)}
</div>

<div className="grid gap-3 rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 md:grid-cols-4">
<button
onClick={openEmail}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
>
<Send size={18} />
Otvoriť email
</button>

<button
onClick={() => copy(emailRecipients.join(", "))}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
>
<Copy size={18} />
Kopírovať emaily
</button>

<button
onClick={() => copy(message)}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
>
<Copy size={18} />
Kopírovať text
</button>

<button
onClick={() => copy(htmlMessage)}
className="inline-flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
>
<Copy size={18} />
Kopírovať HTML
</button>
</div>

<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<div className="mb-4 flex items-center gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white">
<MessageCircle />
</div>

<div className="min-w-0">
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
WhatsApp
</p>
<h2 className="text-2xl font-black">WhatsApp odoslanie</h2>
</div>
</div>

{phoneRecipients.length === 0 ? (
<p className="rounded-2xl bg-[#f7f2e8] p-4 text-sm font-bold text-black/55">
Nie sú dostupné telefónne čísla.
</p>
) : (
<div className="grid gap-3 md:grid-cols-2">
{phoneRecipients.map((r) => (
<a
key={`${r.name}-${r.phone}`}
href={whatsappLink(r.phone)}
target="_blank"
rel="noreferrer"
className="flex min-w-0 flex-col gap-3 rounded-2xl bg-[#f7f2e8] p-4 active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between"
>
<div className="min-w-0">
<p className="break-words font-black">{r.name}</p>
<p className="break-words text-sm text-black/55">{r.phone}</p>
</div>

<span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-black text-white">
<MessageCircle size={18} />
WhatsApp
</span>
</a>
))}
</div>
)}
</div>

{recipients.length > 0 && (
<div className="overflow-hidden rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
<div className="mb-4 flex items-center gap-3">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-800">
<CheckCircle2 />
</div>

<div className="min-w-0">
<p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
Kontrola
</p>
<h2 className="text-2xl font-black">Vybraní príjemcovia</h2>
</div>
</div>

<div className="grid gap-3">
{recipients.slice(0, 8).map((s) => (
<div
key={s.id}
className="rounded-2xl bg-[#f7f2e8] p-4"
>
<p className="break-words font-black">
{s.first_name} {s.last_name}
</p>
<p className="break-words text-sm text-black/55">
{s.dojos?.name || "Bez dojo"} ·{" "}
{s.parent_email || s.email || "Bez emailu"} ·{" "}
{s.parent_phone || s.phone || "Bez telefónu"}
</p>
</div>
))}

{recipients.length > 8 && (
<p className="rounded-2xl bg-[#f7f2e8] p-4 text-sm font-bold text-black/55">
A ďalších {recipients.length - 8} príjemcov...
</p>
)}
</div>
</div>
)}
</div>
);
}
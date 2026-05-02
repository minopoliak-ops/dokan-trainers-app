"use client";

import { gradeOptions } from "@/lib/grades";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function NewStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dojos, setDojos] = useState<any[]>([]);
  const [isAdult, setIsAdult] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDojoId, setSelectedDojoId] = useState("");

  useEffect(() => {
    const dojoFromUrl = searchParams.get("dojo");
    if (dojoFromUrl) setSelectedDojoId(dojoFromUrl);

    const supabase = createClient();

    supabase
      .from("dojos")
      .select("*")
      .order("name")
      .then(({ data }) => setDojos(data || []));
  }, [searchParams]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const dojoId = String(form.get("dojo_id") || "");
    const technicalGrade = String(form.get("technical_grade") || "");
    const gradeSystem = String(form.get("grade_system") || "");
    const gradingDate = String(form.get("last_grading_date") || "");

    if (!dojoId) return alert("Vyber dojo.");

    setSaving(true);

    const payload = {
      dojo_id: dojoId,
      first_name: String(form.get("first_name") || "").trim(),
      last_name: String(form.get("last_name") || "").trim(),
      birth_year: form.get("birth_year") ? Number(form.get("birth_year")) : null,
      is_adult: isAdult,
      parent_name: isAdult ? null : String(form.get("parent_name") || "").trim() || null,
      parent_phone: isAdult ? null : String(form.get("parent_phone") || "").trim() || null,
      parent_email: isAdult ? null : String(form.get("parent_email") || "").trim() || null,
      phone: isAdult ? String(form.get("phone") || "").trim() || null : null,
      email: isAdult ? String(form.get("email") || "").trim() || null : null,
      health_info: String(form.get("health_info") || "").trim() || null,
      medication_info: String(form.get("medication_info") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      grade_system: gradeSystem || null,
      technical_grade: technicalGrade || null,
      last_grading_date: gradingDate || null,
      active: true,
    };

    const { data: student, error } = await supabase
      .from("students")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      return alert(error.message);
    }

    if (technicalGrade) {
      await supabase.from("student_grade_history").insert({
        student_id: student.id,
        grade_system: gradeSystem || null,
        technical_grade: technicalGrade,
        grading_date: gradingDate || null,
      });
    }

    setSaving(false);
    router.push(`/students/${student.id}`);
  }

  const inputClass =
    "box-border h-[54px] w-full min-w-0 max-w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white";

  const textareaClass =
    "box-border min-h-[110px] w-full min-w-0 max-w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-base font-semibold outline-none focus:border-[#d71920] focus:bg-white";

  const labelClass = "mb-2 block text-sm font-black text-black/55";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="min-w-0 p-6">
          <div
            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isAdult ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            {isAdult ? <UserRound size={28} /> : <Users size={28} />}
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Nový cvičiaci
          </p>

          <h1 className="mt-2 break-words text-4xl font-black tracking-tight">
            Pridať žiaka
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Vytvor profil cvičiaceho, priraď dojo, kontakt, technický stupeň a
            poznámky pre trénerov.
          </p>

          <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-3">
            <div className="min-w-0 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Typ</p>
              <p className="truncate text-2xl font-black">
                {isAdult ? "Dospelý" : "Dieťa"}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Dojo</p>
              <p className="truncate text-2xl font-black">
                {dojos.find((d) => d.id === selectedDojoId)?.name || "Nevybrané"}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Stav</p>
              <p className="truncate text-2xl font-black">
                {saving ? "Ukladám..." : "Nový profil"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={save}
        className="grid min-w-0 gap-6 overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Základné údaje
          </p>
          <h2 className="break-words text-2xl font-black">Cvičiaci</h2>
        </div>

        <div className="min-w-0">
          <label className={labelClass}>
            <span className="inline-flex items-center gap-2">
              <MapPin size={17} />
              Dojo
            </span>
          </label>

          <select
            name="dojo_id"
            required
            value={selectedDojoId}
            onChange={(e) => setSelectedDojoId(e.target.value)}
            className={inputClass}
          >
            <option value="">Vyber dojo</option>
            {dojos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 rounded-3xl bg-[#f7f2e8] p-2">
          <button
            type="button"
            onClick={() => setIsAdult(false)}
            className={`min-w-0 rounded-2xl px-3 py-4 font-black active:scale-[0.98] ${
              !isAdult ? "bg-blue-600 text-white" : "bg-white text-black"
            }`}
          >
            Dieťa
          </button>

          <button
            type="button"
            onClick={() => setIsAdult(true)}
            className={`min-w-0 rounded-2xl px-3 py-4 font-black active:scale-[0.98] ${
              isAdult ? "bg-green-600 text-white" : "bg-white text-black"
            }`}
          >
            Dospelý
          </button>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className={labelClass}>
              {isAdult ? "Meno dospelého cvičiaceho" : "Meno dieťaťa"}
            </label>
            <input name="first_name" required placeholder="Meno" className={inputClass} />
          </div>

          <div className="min-w-0">
            <label className={labelClass}>
              {isAdult ? "Priezvisko dospelého cvičiaceho" : "Priezvisko dieťaťa"}
            </label>
            <input
              name="last_name"
              required
              placeholder="Priezvisko"
              className={inputClass}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label className={labelClass}>Rok narodenia</label>
          <input
            name="birth_year"
            type="number"
            placeholder="Rok narodenia"
            className={inputClass}
          />
        </div>

        <div className="min-w-0 overflow-hidden rounded-[26px] bg-[#f7f2e8] p-4">
          <div className="mb-4 min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Kontakt
            </p>
            <h3 className="break-words text-xl font-black">
              {isAdult ? "Kontakt cvičiaceho" : "Kontakt rodiča"}
            </h3>
          </div>

          {isAdult ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Phone size={17} />
                    Telefón
                  </span>
                </label>
                <input name="phone" placeholder="Telefón" className={inputClass} />
              </div>

              <div className="min-w-0">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Mail size={17} />
                    Email
                  </span>
                </label>
                <input name="email" type="email" placeholder="Email" className={inputClass} />
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <label className={labelClass}>Meno rodiča</label>
                <input name="parent_name" placeholder="Meno rodiča" className={inputClass} />
              </div>

              <div className="min-w-0">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Phone size={17} />
                    Telefón rodiča
                  </span>
                </label>
                <input
                  name="parent_phone"
                  placeholder="Telefón rodiča"
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Mail size={17} />
                    Email rodiča
                  </span>
                </label>
                <input
                  name="parent_email"
                  type="email"
                  placeholder="Email rodiča"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-[26px] bg-[#f7f2e8] p-4">
          <div className="mb-4 min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Technický stupeň
            </p>
            <h3 className="break-words text-xl font-black">Páskovanie / skúšky</h3>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <div className="min-w-0">
              <label className={labelClass}>Typ stupňa</label>
              <select name="grade_system" className={inputClass}>
                <option value="">Typ stupňa</option>
                <option value="child">Detské pásiky</option>
                <option value="kyu_dan">Kyu / Dan</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <GraduationCap size={17} />
                  Technický stupeň
                </span>
              </label>
              <select name="technical_grade" className={inputClass}>
                <option value="">Technický stupeň</option>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={17} />
                  Dátum skúšok
                </span>
              </label>
              <input name="last_grading_date" type="date" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4 overflow-hidden rounded-[26px] bg-[#f7f2e8] p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Bezpečnosť a poznámky
            </p>
            <h3 className="break-words text-xl font-black">Zdravie, lieky, poznámky</h3>
          </div>

          <div className="min-w-0">
            <label className={labelClass}>
              <span className="inline-flex items-center gap-2">
                <HeartPulse size={17} />
                Zdravotný stav
              </span>
            </label>
            <textarea
              name="health_info"
              rows={3}
              placeholder="Zdravotný stav"
              className={textareaClass}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClass}>
              <span className="inline-flex items-center gap-2">
                <ShieldAlert size={17} />
                Lieky
              </span>
            </label>
            <textarea
              name="medication_info"
              rows={3}
              placeholder="Lieky"
              className={textareaClass}
            />
          </div>

          <div className="min-w-0">
            <label className={labelClass}>Poznámka</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Poznámka"
              className={textareaClass}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <button
            disabled={saving}
            className="inline-flex h-[58px] min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-60"
          >
            <Save size={20} />
            {saving ? "Ukladám..." : "Uložiť žiaka"}
          </button>

          <Link
            href="/students"
            className="inline-flex h-[58px] min-w-0 items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
          >
            <ArrowLeft size={18} />
            Späť na žiakov
          </Link>
        </div>
      </form>
    </div>
  );
}
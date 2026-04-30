"use client";

import { gradeOptions } from "@/lib/grades";
import { createClient } from "@/lib/supabase/browser";
import { Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function NewStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dojoFromUrl = searchParams.get("dojo") || "";

  const [dojos, setDojos] = useState<any[]>([]);
  const [selectedDojoId, setSelectedDojoId] = useState(dojoFromUrl);
  const [isAdult, setIsAdult] = useState(false);
  const [loadingDojos, setLoadingDojos] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadDojos() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("dojos")
        .select("id, name")
        .order("name");

      if (!alive) return;

      if (error) {
        alert(error.message);
        setDojos([]);
      } else {
        setDojos(data || []);
      }

      setLoadingDojos(false);
    }

    loadDojos();

    return () => {
      alive = false;
    };
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const dojoId = String(form.get("dojo_id") || "").trim();
    const firstName = String(form.get("first_name") || "").trim();
    const lastName = String(form.get("last_name") || "").trim();

    if (!dojoId) return alert("Vyber dojo.");
    if (!firstName || !lastName) return alert("Vyplň meno a priezvisko.");

    setSaving(true);

    const payload = {
      dojo_id: dojoId,
      first_name: firstName,
      last_name: lastName,
      birth_year: form.get("birth_year") ? Number(form.get("birth_year")) : null,
      is_adult: isAdult,

      parent_name: isAdult
        ? null
        : String(form.get("parent_name") || "").trim() || null,
      parent_phone: isAdult
        ? null
        : String(form.get("parent_phone") || "").trim() || null,
      parent_email: isAdult
        ? null
        : String(form.get("parent_email") || "").trim() || null,

      phone: isAdult ? String(form.get("phone") || "").trim() || null : null,
      email: isAdult ? String(form.get("email") || "").trim() || null : null,

      health_info: String(form.get("health_info") || "").trim() || null,
      medication_info: String(form.get("medication_info") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      grade_system: String(form.get("grade_system") || "").trim() || null,
      technical_grade: String(form.get("technical_grade") || "").trim() || null,
      last_grading_date:
        String(form.get("last_grading_date") || "").trim() || null,
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

    if (student?.id && payload.technical_grade) {
      await supabase.from("student_grade_history").insert({
        student_id: student.id,
        grade_system: payload.grade_system,
        technical_grade: payload.technical_grade,
        grading_date: payload.last_grading_date,
      });
    }

    router.push(`/dojos/${dojoId}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Pridať žiaka</h1>
        <p className="mt-2 text-white/70">
          Vyber, či ide o dieťa alebo dospelého cvičiaceho.
        </p>
      </div>

      <form
        onSubmit={save}
        className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
      >
        <select
          name="dojo_id"
          required
          value={selectedDojoId}
          disabled={loadingDojos || saving}
          onChange={(e) => setSelectedDojoId(e.target.value)}
          className="h-[52px] rounded-xl border px-4 py-3 disabled:opacity-60"
        >
          <option value="">
            {loadingDojos ? "Načítavam dojo..." : "Vyber dojo"}
          </option>
          {dojos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f7f2e8] p-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => setIsAdult(false)}
            className={`rounded-xl py-3 font-bold ${
              !isAdult ? "bg-[#d71920] text-white" : "bg-white text-black"
            }`}
          >
            Dieťa
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => setIsAdult(true)}
            className={`rounded-xl py-3 font-bold ${
              isAdult ? "bg-[#d71920] text-white" : "bg-white text-black"
            }`}
          >
            Dospelý
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="first_name"
            required
            disabled={saving}
            placeholder={isAdult ? "Meno dospelého" : "Meno dieťaťa"}
            className="h-[52px] rounded-xl border px-4 py-3"
          />
          <input
            name="last_name"
            required
            disabled={saving}
            placeholder={isAdult ? "Priezvisko dospelého" : "Priezvisko dieťaťa"}
            className="h-[52px] rounded-xl border px-4 py-3"
          />
        </div>

        <input
          name="birth_year"
          type="number"
          disabled={saving}
          placeholder="Rok narodenia"
          className="h-[52px] rounded-xl border px-4 py-3"
        />

        {isAdult ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="phone"
              disabled={saving}
              placeholder="Telefón cvičiaceho"
              className="h-[52px] rounded-xl border px-4 py-3"
            />
            <input
              name="email"
              type="email"
              disabled={saving}
              placeholder="Email cvičiaceho"
              className="h-[52px] rounded-xl border px-4 py-3"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              name="parent_name"
              disabled={saving}
              placeholder="Meno rodiča"
              className="h-[52px] rounded-xl border px-4 py-3"
            />
            <input
              name="parent_phone"
              disabled={saving}
              placeholder="Telefón rodiča"
              className="h-[52px] rounded-xl border px-4 py-3"
            />
            <input
              name="parent_email"
              type="email"
              disabled={saving}
              placeholder="Email rodiča"
              className="h-[52px] rounded-xl border px-4 py-3"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <select
            name="grade_system"
            disabled={saving}
            className="h-[52px] rounded-xl border px-4 py-3"
          >
            <option value="">Typ stupňa</option>
            <option value="child">Detské pásiky</option>
            <option value="kyu_dan">Kyu / Dan</option>
          </select>

          <select
            name="technical_grade"
            disabled={saving}
            className="h-[52px] rounded-xl border px-4 py-3"
          >
            <option value="">Technický stupeň</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <input
            name="last_grading_date"
            type="date"
            disabled={saving}
            className="h-[52px] rounded-xl border px-4 py-3"
          />
        </div>

        <textarea
          name="health_info"
          rows={3}
          disabled={saving}
          placeholder="Zdravotný stav"
          className="rounded-xl border px-4 py-3"
        />

        <textarea
          name="medication_info"
          rows={3}
          disabled={saving}
          placeholder="Lieky"
          className="rounded-xl border px-4 py-3"
        />

        <textarea
          name="notes"
          rows={3}
          disabled={saving}
          placeholder="Poznámka"
          className="rounded-xl border px-4 py-3"
        />

        <button
          disabled={saving || loadingDojos}
          className="inline-flex h-[54px] items-center justify-center gap-2 rounded-xl bg-brand-red px-4 font-bold text-white disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? "Ukladám..." : "Uložiť žiaka"}
        </button>
      </form>
    </div>
  );
}
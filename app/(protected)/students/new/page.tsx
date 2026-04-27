"use client";

import { gradeOptions } from "@/lib/grades";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function NewStudentPage() {
  const router = useRouter();
  const [dojos, setDojos] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("dojos").select("*").order("name").then(({ data }) => setDojos(data || []));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const payload = {
      dojo_id: String(form.get("dojo_id") || ""),
      first_name: String(form.get("first_name") || "").trim(),
      last_name: String(form.get("last_name") || "").trim(),
      birth_year: form.get("birth_year") ? Number(form.get("birth_year")) : null,
      parent_name: String(form.get("parent_name") || "") || null,
      parent_phone: String(form.get("parent_phone") || "") || null,
      parent_email: String(form.get("parent_email") || "") || null,
      health_info: String(form.get("health_info") || "") || null,
      medication_info: String(form.get("medication_info") || "") || null,
      notes: String(form.get("notes") || "") || null,
      grade_system: String(form.get("grade_system") || "") || null,
      technical_grade: String(form.get("technical_grade") || "") || null,
      last_grading_date: String(form.get("last_grading_date") || "") || null,
      active: true
    };

    const { data: student, error } = await supabase.from("students").insert(payload).select("id").single();
    if (error) return alert(error.message);

    if (payload.technical_grade) {
      await supabase.from("student_grade_history").insert({
        student_id: student.id,
        grade_system: payload.grade_system,
        technical_grade: payload.technical_grade,
        grading_date: payload.last_grading_date
      });
    }

    router.push("/students");
  }

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-brand-black p-6 text-white"><h1 className="text-3xl font-bold">Pridať žiaka</h1></div>

      <form onSubmit={save} className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <select name="dojo_id" required className="rounded-xl border px-4 py-3">
          <option value="">Vyber dojo</option>
          {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div className="grid gap-4 sm:grid-cols-2">
          <input name="first_name" required placeholder="Meno" className="rounded-xl border px-4 py-3" />
          <input name="last_name" required placeholder="Priezvisko" className="rounded-xl border px-4 py-3" />
        </div>

        <input name="birth_year" type="number" placeholder="Rok narodenia" className="rounded-xl border px-4 py-3" />

        <div className="grid gap-4 sm:grid-cols-3">
          <input name="parent_name" placeholder="Rodič" className="rounded-xl border px-4 py-3" />
          <input name="parent_phone" placeholder="Telefón" className="rounded-xl border px-4 py-3" />
          <input name="parent_email" type="email" placeholder="Email rodiča" className="rounded-xl border px-4 py-3" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <select name="grade_system" className="rounded-xl border px-4 py-3">
            <option value="">Typ stupňa</option>
            <option value="child">Detské pásiky</option>
            <option value="kyu_dan">Kyu / Dan</option>
          </select>
          <select name="technical_grade" className="rounded-xl border px-4 py-3">
            <option value="">Technický stupeň</option>
            {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input name="last_grading_date" type="date" className="rounded-xl border px-4 py-3" />
        </div>

        <textarea name="health_info" rows={3} placeholder="Zdravotný stav" className="rounded-xl border px-4 py-3" />
        <textarea name="medication_info" rows={3} placeholder="Lieky" className="rounded-xl border px-4 py-3" />
        <textarea name="notes" rows={3} placeholder="Poznámka" className="rounded-xl border px-4 py-3" />

        <button className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white">Uložiť žiaka</button>
      </form>
    </div>
  );
}

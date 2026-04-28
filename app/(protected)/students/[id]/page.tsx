"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [student, setStudent] = useState<any>(null);
  const [dojos, setDojos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit =
    permissions?.can_add_students || permissions?.can_manage_trainers;

  const canDelete =
    permissions?.can_delete_students || permissions?.can_manage_trainers;

  async function loadData() {
    const supabase = createClient();

    const studentRes = await supabase
      .from("students")
      .select("*, dojos(name, address)")
      .eq("id", params.id)
      .single();

    const dojosRes = await supabase.from("dojos").select("*").order("name");

    if (studentRes.error) console.error(studentRes.error);

    setStudent(studentRes.data);
    setDojos(dojosRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  function updateField(field: string, value: any) {
    setStudent((current: any) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveStudent() {
    if (!canEdit) {
      alert("Nemáš oprávnenie upravovať žiaka.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { dojos, ...payload } = student;

    const { error } = await supabase
      .from("students")
      .update({
        first_name: payload.first_name || null,
        last_name: payload.last_name || null,
        birth_year: payload.birth_year ? Number(payload.birth_year) : null,
        parent_name: payload.parent_name || null,
        parent_phone: payload.parent_phone || null,
        parent_email: payload.parent_email || null,
        health_info: payload.health_info || null,
        medication_info: payload.medication_info || null,
        technical_grade: payload.technical_grade || null,
        last_grading_date: payload.last_grading_date || null,
        notes: payload.notes || null,
        dojo_id: payload.dojo_id || null,
      })
      .eq("id", params.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Žiak uložený.");
    loadData();
  }

  async function deleteStudent() {
    if (!canDelete) {
      alert("Nemáš oprávnenie vymazať žiaka.");
      return;
    }

    if (!confirm("Naozaj vymazať/deaktivovať žiaka?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("students")
      .update({ active: false })
      .eq("id", params.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Žiak bol deaktivovaný.");
    window.location.href = "/students";
  }

  const inputClass =
    "h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px] outline-none focus:border-[#d71920] focus:bg-white";

  const textAreaClass =
    "min-h-[110px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-[16px] outline-none focus:border-[#d71920] focus:bg-white";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        Načítavam profil žiaka...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        Žiak sa nenašiel.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-white/60">{student.dojos?.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          {student.first_name} {student.last_name}
        </h1>
        <p className="mt-2 text-white/70">
          {student.technical_grade || "Bez technického stupňa"}
        </p>
      </div>

      <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-black/5 space-y-4">
        <h2 className="text-2xl font-extrabold">Upraviť žiaka</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Meno"
            value={student.first_name || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("first_name", e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="Priezvisko"
            value={student.last_name || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("last_name", e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="Rok narodenia"
            type="number"
            value={student.birth_year || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("birth_year", e.target.value)}
          />

          <select
            className={inputClass}
            value={student.dojo_id || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("dojo_id", e.target.value)}
          >
            <option value="">Bez dojo</option>
            {dojos.map((dojo) => (
              <option key={dojo.id} value={dojo.id}>
                {dojo.name}
              </option>
            ))}
          </select>

          <input
            className={inputClass}
            placeholder="Technický stupeň"
            value={student.technical_grade || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("technical_grade", e.target.value)}
          />

          <input
            className={inputClass}
            type="date"
            value={student.last_grading_date || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("last_grading_date", e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="Meno rodiča"
            value={student.parent_name || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("parent_name", e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="Telefón rodiča"
            value={student.parent_phone || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("parent_phone", e.target.value)}
          />

          <input
            className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px] outline-none focus:border-[#d71920] focus:bg-white md:col-span-2"
            placeholder="Email rodiča"
            type="email"
            value={student.parent_email || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("parent_email", e.target.value)}
          />
        </div>

        <textarea
          className={textAreaClass}
          placeholder="Zdravotné poznámky"
          value={student.health_info || ""}
          disabled={!canEdit}
          onChange={(e) => updateField("health_info", e.target.value)}
        />

        <textarea
          className={textAreaClass}
          placeholder="Lieky"
          value={student.medication_info || ""}
          disabled={!canEdit}
          onChange={(e) => updateField("medication_info", e.target.value)}
        />

        <textarea
          className={textAreaClass}
          placeholder="Poznámky"
          value={student.notes || ""}
          disabled={!canEdit}
          onChange={(e) => updateField("notes", e.target.value)}
        />

        <div className="grid gap-3 md:grid-cols-2">
          {canEdit && (
            <button
              onClick={saveStudent}
              disabled={saving}
              className="inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              <Save size={20} />
              {saving ? "Ukladám..." : "Uložiť zmeny"}
            </button>
          )}

          {canDelete && (
            <button
              onClick={deleteStudent}
              className="inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-black px-4 font-bold text-white active:scale-[0.98]"
            >
              <Trash2 size={20} />
              Deaktivovať žiaka
            </button>
          )}
        </div>
      </div>

      <Link
        href={`/dojos/${student.dojo_id}`}
        className="inline-block rounded-2xl bg-[#d71920] px-5 py-3 font-bold text-white"
      >
        Späť do dojo
      </Link>
    </div>
  );
}
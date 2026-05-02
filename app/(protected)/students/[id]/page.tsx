"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
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
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [student, setStudent] = useState<any>(null);
  const [dojos, setDojos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = permissions?.can_add_students || permissions?.can_manage_trainers;
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

  const isAdult = student?.is_adult === true;

  const contactPhone = useMemo(() => {
    if (!student) return "";
    return isAdult
      ? student.parent_phone || student.phone || ""
      : student.parent_phone || student.phone || "";
  }, [student, isAdult]);

  const contactEmail = useMemo(() => {
    if (!student) return "";
    return student.parent_email || student.email || "";
  }, [student]);

  async function saveStudent() {
    if (!canEdit) return alert("Nemáš oprávnenie upravovať žiaka.");

    setSaving(true);
    const supabase = createClient();

    const { dojos, ...payload } = student;

    const { error } = await supabase
      .from("students")
      .update({
        first_name: payload.first_name || null,
        last_name: payload.last_name || null,
        birth_year: payload.birth_year ? Number(payload.birth_year) : null,
        is_adult: !!payload.is_adult,
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

    if (error) return alert(error.message);

    alert("Cvičiaci uložený.");
    loadData();
  }

  async function deleteStudent() {
    if (!canDelete) return alert("Nemáš oprávnenie vymazať cvičiaceho.");
    if (!confirm("Naozaj deaktivovať cvičiaceho?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("students")
      .update({ active: false })
      .eq("id", params.id);

    if (error) return alert(error.message);

    alert("Cvičiaci bol deaktivovaný.");
    window.location.href = "/students";
  }

  const inputClass =
    "box-border h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white disabled:opacity-60";

  const labelClass = "mb-2 block text-sm font-black text-black/55";

  const textAreaClass =
    "min-h-[120px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-[16px] font-semibold outline-none focus:border-[#d71920] focus:bg-white disabled:opacity-60";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Načítavam profil...
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Cvičiaci sa nenašiel.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div
            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isAdult ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            {isAdult ? <UserRound size={28} /> : <Users size={28} />}
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Profil cvičiaceho
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {student.first_name} {student.last_name}
          </h1>

          <p className="mt-2 max-w-2xl text-white/65">
            {student.dojos?.name || "Bez dojo"} ·{" "}
            {student.technical_grade || "Bez technického stupňa"}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Typ</p>
              <p className="text-2xl font-black">
                {isAdult ? "Dospelý" : "Dieťa"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Rok narodenia</p>
              <p className="text-2xl font-black">
                {student.birth_year || "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Stupeň</p>
              <p className="text-2xl font-black">
                {student.technical_grade || "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Skúšanie</p>
              <p className="text-2xl font-black">
                {student.last_grading_date || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white">
            <MapPin />
          </div>
          <h2 className="text-xl font-black">Dojo</h2>
          <p className="mt-1 text-sm font-bold text-black/55">
            {student.dojos?.name || "Bez dojo"}
          </p>
          <p className="mt-1 text-sm text-black/45">
            {student.dojos?.address || "Bez adresy"}
          </p>
        </div>

        <a
          href={contactPhone ? `tel:${contactPhone}` : undefined}
          className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white">
            <Phone />
          </div>
          <h2 className="text-xl font-black">Telefón</h2>
          <p className="mt-1 text-sm font-bold text-black/55">
            {contactPhone || "Nie je vyplnený"}
          </p>
        </a>

        <a
          href={contactEmail ? `mailto:${contactEmail}` : undefined}
          className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
            <Mail />
          </div>
          <h2 className="text-xl font-black">Email</h2>
          <p className="mt-1 break-all text-sm font-bold text-black/55">
            {contactEmail || "Nie je vyplnený"}
          </p>
        </a>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Úprava profilu
          </p>
          <h2 className="text-2xl font-black">Osobné údaje</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-[#f7f2e8] p-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateField("is_adult", false)}
            className={`rounded-2xl px-4 py-4 font-black active:scale-[0.98] disabled:opacity-60 ${
              !isAdult ? "bg-blue-600 text-white" : "bg-white text-black"
            }`}
          >
            Dieťa
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateField("is_adult", true)}
            className={`rounded-2xl px-4 py-4 font-black active:scale-[0.98] disabled:opacity-60 ${
              isAdult ? "bg-green-600 text-white" : "bg-white text-black"
            }`}
          >
            Dospelý
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              {isAdult ? "Meno dospelého cvičiaceho" : "Meno dieťaťa"}
            </label>
            <input
              className={inputClass}
              value={student.first_name || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("first_name", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              {isAdult
                ? "Priezvisko dospelého cvičiaceho"
                : "Priezvisko dieťaťa"}
            </label>
            <input
              className={inputClass}
              value={student.last_name || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("last_name", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Rok narodenia</label>
            <input
              className={inputClass}
              type="number"
              value={student.birth_year || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("birth_year", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Dojo</label>
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
          </div>

          <div>
            <label className={labelClass}>Technický stupeň</label>
            <div className="relative">
              <GraduationCap
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              />
              <input
                className={`${inputClass} pl-11`}
                value={student.technical_grade || ""}
                disabled={!canEdit}
                onChange={(e) => updateField("technical_grade", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Dátum posledného skúšania / páskovania
            </label>
            <div className="relative">
              <CalendarDays
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              />
              <input
                type="date"
                className={`${inputClass} pl-11`}
                value={student.last_grading_date || ""}
                disabled={!canEdit}
                onChange={(e) =>
                  updateField("last_grading_date", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Kontakt
          </p>
          <h2 className="text-2xl font-black">
            {isAdult ? "Kontakt cvičiaceho" : "Kontakt rodiča"}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {!isAdult && (
            <div className="md:col-span-2">
              <label className={labelClass}>Meno a priezvisko rodiča</label>
              <input
                className={inputClass}
                value={student.parent_name || ""}
                disabled={!canEdit}
                onChange={(e) => updateField("parent_name", e.target.value)}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              {isAdult ? "Telefón cvičiaceho" : "Telefón rodiča"}
            </label>
            <input
              className={inputClass}
              value={student.parent_phone || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("parent_phone", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              {isAdult ? "Email cvičiaceho" : "Email rodiča"}
            </label>
            <input
              className={inputClass}
              type="email"
              value={student.parent_email || ""}
              disabled={!canEdit}
              onChange={(e) => updateField("parent_email", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Bezpečnosť a poznámky
          </p>
          <h2 className="text-2xl font-black">Zdravie, lieky, poznámky</h2>
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-2">
              <HeartPulse size={17} />
              Zdravotné poznámky
            </span>
          </label>
          <textarea
            className={textAreaClass}
            placeholder="Zdravotné poznámky"
            value={student.health_info || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("health_info", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-2">
              <ShieldAlert size={17} />
              Lieky
            </span>
          </label>
          <textarea
            className={textAreaClass}
            placeholder="Lieky"
            value={student.medication_info || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("medication_info", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Poznámky</label>
          <textarea
            className={textAreaClass}
            placeholder="Poznámky"
            value={student.notes || ""}
            disabled={!canEdit}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {canEdit && (
          <button
            onClick={saveStudent}
            disabled={saving}
            className="inline-flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-60"
          >
            <Save size={20} />
            {saving ? "Ukladám..." : "Uložiť zmeny"}
          </button>
        )}

        {canDelete && (
          <button
            onClick={deleteStudent}
            className="inline-flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
          >
            <Trash2 size={20} />
            Deaktivovať cvičiaceho
          </button>
        )}
      </div>

      <Link
        href={`/dojos/${student.dojo_id}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black/10 px-5 py-4 font-black text-black active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        Späť do dojo
      </Link>
    </div>
  );
}
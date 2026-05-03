"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  Layers3,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Syllabus = {
  id: string;
  grade_name: string;
  grade_type: string | null;
  sort_order: number | null;
  active: boolean | null;
};

type Section = {
  id: string;
  syllabus_id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  active: boolean | null;
};

type Technique = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  active: boolean | null;
};

type Log = {
  id: string;
  technique_id: string;
  dojo_id: string | null;
  training_id: string | null;
  trainer_id: string | null;
  practiced_date: string;
  note: string | null;
};

const gradeTypes = [
  { key: "child", label: "Detské pásiky" },
  { key: "kyu_dan", label: "Kyu" },
  { key: "dan", label: "Dan" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function gradeTypeLabel(type?: string | null) {
  return gradeTypes.find((g) => g.key === type)?.label || "Stupeň";
}

export default function TechnicalGradesPage() {
  const { permissions } = usePermissions();
  const isAdmin = !!permissions?.can_manage_trainers;
  const canManage = isAdmin || !!permissions?.can_manage_topics;
  const canPractice = isAdmin || !!permissions?.can_create_trainings || !!permissions?.can_attendance;

  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);

  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");
  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [practiceDate, setPracticeDate] = useState(today());
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const [syllabiRes, sectionsRes, techniquesRes, dojosRes] = await Promise.all([
      supabase
        .from("technical_grade_syllabus")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("grade_name"),
      supabase
        .from("syllabus_sections")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name"),
      supabase
        .from("syllabus_techniques")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name"),
      supabase.from("dojos").select("*").order("name"),
    ]);

    if (syllabiRes.error) alert(syllabiRes.error.message);
    if (sectionsRes.error) alert(sectionsRes.error.message);
    if (techniquesRes.error) alert(techniquesRes.error.message);
    if (dojosRes.error) console.error(dojosRes.error.message);

    setSyllabi(syllabiRes.data || []);
    setSections(sectionsRes.data || []);
    setTechniques(techniquesRes.data || []);
    setDojos(dojosRes.data || []);

    if (!selectedSyllabusId && (syllabiRes.data || []).length > 0) {
      setSelectedSyllabusId(syllabiRes.data![0].id);
    }

    setLoading(false);
  }

  async function loadLogsAndTrainings() {
    const supabase = createClient();

    let trainingsQuery = supabase
      .from("trainings")
      .select("id, title, training_date, dojo_id, dojos(name), training_topics(name)")
      .eq("training_date", practiceDate)
      .order("training_date", { ascending: false });

    if (selectedDojoId) trainingsQuery = trainingsQuery.eq("dojo_id", selectedDojoId);

    const logsQuery = supabase
      .from("training_technique_logs")
      .select("*")
      .eq("practiced_date", practiceDate);

    const [trainingsRes, logsRes] = await Promise.all([trainingsQuery, logsQuery]);

    if (trainingsRes.error) console.error(trainingsRes.error.message);
    if (logsRes.error) console.error(logsRes.error.message);

    setTrainings(trainingsRes.data || []);
    setLogs(logsRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLogsAndTrainings();
  }, [practiceDate, selectedDojoId]);

  const selectedSyllabus = syllabi.find((s) => s.id === selectedSyllabusId);

  const selectedSections = useMemo(() => {
    return sections.filter((s) => s.syllabus_id === selectedSyllabusId);
  }, [sections, selectedSyllabusId]);

  const selectedTechniqueIds = useMemo(() => {
    const sectionIds = selectedSections.map((s) => s.id);
    return techniques.filter((t) => sectionIds.includes(t.section_id)).map((t) => t.id);
  }, [techniques, selectedSections]);

  const practicedTechniqueIds = useMemo(() => {
    return new Set(
      logs
        .filter((l) => {
          const dojoOk = selectedDojoId ? l.dojo_id === selectedDojoId : true;
          const trainingOk = selectedTrainingId ? l.training_id === selectedTrainingId : true;
          return dojoOk && trainingOk;
        })
        .map((l) => l.technique_id)
    );
  }, [logs, selectedDojoId, selectedTrainingId]);

  const practicedCount = selectedTechniqueIds.filter((id) => practicedTechniqueIds.has(id)).length;
  const progress = selectedTechniqueIds.length
    ? Math.round((practicedCount / selectedTechniqueIds.length) * 100)
    : 0;

  function sectionTechniques(sectionId: string) {
    const q = search.toLowerCase().trim();
    return techniques.filter((t) => {
      if (t.section_id !== sectionId) return false;
      if (!q) return true;
      return [t.name, t.description].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }

  async function addSyllabus(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return alert("Nemáš oprávnenie spravovať technické stupne.");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("technical_grade_syllabus").insert({
      grade_name: String(form.get("grade_name") || "").trim(),
      grade_type: String(form.get("grade_type") || "kyu_dan"),
      sort_order: Number(form.get("sort_order") || 0),
      active: true,
    });

    if (error) return alert(error.message);
    e.currentTarget.reset();
    loadData();
  }

  async function addSection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return alert("Nemáš oprávnenie spravovať sekcie.");
    if (!selectedSyllabusId) return alert("Vyber technický stupeň.");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("syllabus_sections").insert({
      syllabus_id: selectedSyllabusId,
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      active: true,
    });

    if (error) return alert(error.message);
    e.currentTarget.reset();
    loadData();
  }

  async function addTechnique(e: FormEvent<HTMLFormElement>, sectionId: string) {
    e.preventDefault();
    if (!canManage) return alert("Nemáš oprávnenie spravovať techniky.");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("syllabus_techniques").insert({
      section_id: sectionId,
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      active: true,
    });

    if (error) return alert(error.message);
    e.currentTarget.reset();
    loadData();
  }

  async function toggleTechnique(techniqueId: string) {
    if (!canPractice) return alert("Nemáš oprávnenie označovať odcvičené techniky.");

    const supabase = createClient();
    const existing = logs.find(
      (l) =>
        l.technique_id === techniqueId &&
        l.practiced_date === practiceDate &&
        (selectedDojoId ? l.dojo_id === selectedDojoId : !l.dojo_id) &&
        (selectedTrainingId ? l.training_id === selectedTrainingId : true)
    );

    if (existing) {
      const { error } = await supabase
        .from("training_technique_logs")
        .delete()
        .eq("id", existing.id);

      if (error) return alert(error.message);
      setLogs((prev) => prev.filter((l) => l.id !== existing.id));
      return;
    }

    const { data, error } = await supabase
      .from("training_technique_logs")
      .insert({
        technique_id: techniqueId,
        dojo_id: selectedDojoId || null,
        training_id: selectedTrainingId || null,
        trainer_id: permissions?.id || null,
        practiced_date: practiceDate,
      })
      .select("*")
      .single();

    if (error) return alert(error.message);
    if (data) setLogs((prev) => [...prev, data]);
  }

  async function deleteTechnique(id: string) {
    if (!canManage) return;
    if (!confirm("Vymazať techniku?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("syllabus_techniques").delete().eq("id", id);
    if (error) return alert(error.message);
    loadData();
  }

  async function deleteSection(id: string) {
    if (!canManage) return;
    if (!confirm("Vymazať celú sekciu aj s technikami?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("syllabus_sections").delete().eq("id", id);
    if (error) return alert(error.message);
    loadData();
  }

  const inputClass =
    "h-[54px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white";
  const textareaClass =
    "min-h-[90px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-base font-semibold outline-none focus:border-[#d71920] focus:bg-white";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <GraduationCap size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Technické stupne
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Syllabus tréningu</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Vytvor sekcie a techniky podľa stupňov. Počas tréningu tréner označí,
            čo už bolo odcvičené.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Stupne</p>
              <p className="text-3xl font-black">{syllabi.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Sekcie</p>
              <p className="text-3xl font-black">{selectedSections.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Techniky</p>
              <p className="text-3xl font-black">{selectedTechniqueIds.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Odcvičené</p>
              <p className="text-3xl font-black text-green-300">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
            <ClipboardList />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">Výber tréningu</p>
            <h2 className="text-2xl font-black">Čo ideme cvičiť</h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={selectedSyllabusId}
            onChange={(e) => setSelectedSyllabusId(e.target.value)}
            className={inputClass}
          >
            <option value="">Vyber stupeň</option>
            {syllabi.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade_name} · {gradeTypeLabel(s.grade_type)}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={practiceDate}
            onChange={(e) => setPracticeDate(e.target.value)}
            className={inputClass}
          />

          <select
            value={selectedDojoId}
            onChange={(e) => {
              setSelectedDojoId(e.target.value);
              setSelectedTrainingId("");
            }}
            className={inputClass}
          >
            <option value="">Všetky dojo / bez dojo</option>
            {dojos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTrainingId}
            onChange={(e) => setSelectedTrainingId(e.target.value)}
            className={inputClass}
          >
            <option value="">Bez konkrétneho tréningu</option>
            {trainings.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.training_date} · {t.title || "Tréning"} · {t.dojos?.name || "Dojo"}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-[#d71920] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={addSyllabus} className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-3">
            <div className="flex items-center gap-3">
              <Award className="text-[#d71920]" />
              <h2 className="text-xl font-black">Pridať stupeň</h2>
            </div>
            <input name="grade_name" required placeholder="Napr. 9. kyu alebo Biely pásik" className={inputClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="grade_type" className={inputClass} defaultValue="kyu_dan">
                {gradeTypes.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
              <input name="sort_order" type="number" placeholder="Poradie" className={inputClass} />
            </div>
            <button className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]">
              <Plus size={20} /> Pridať stupeň
            </button>
          </form>

          <form onSubmit={addSection} className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-3">
            <div className="flex items-center gap-3">
              <Layers3 className="text-[#d71920]" />
              <h2 className="text-xl font-black">Pridať sekciu do stupňa</h2>
            </div>
            <input name="name" required placeholder="Napr. Kihon, Kata, Kumite" className={inputClass} />
            <textarea name="description" placeholder="Poznámka k sekcii" className={textareaClass} />
            <input name="sort_order" type="number" placeholder="Poradie" className={inputClass} />
            <button className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white active:scale-[0.98]">
              <Plus size={20} /> Pridať sekciu
            </button>
          </form>
        </div>
      )}

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">{selectedSyllabus?.grade_name || "Stupeň"}</p>
            <h2 className="text-2xl font-black">Sekcie a techniky</h2>
          </div>
          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať techniku..."
              className={`${inputClass} pl-11`}
            />
          </div>
        </div>

        {loading ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center font-bold text-black/55">Načítavam...</p>
        ) : selectedSections.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center font-bold text-black/55">
            Tento stupeň ešte nemá sekcie. Pridaj napríklad Kihon.
          </p>
        ) : (
          <div className="grid gap-4">
            {selectedSections.map((section) => {
              const items = sectionTechniques(section.id);
              const isOpen = openSections[section.id] ?? true;
              const done = items.filter((t) => practicedTechniqueIds.has(t.id)).length;

              return (
                <div key={section.id} className="overflow-hidden rounded-[28px] bg-[#f7f2e8] ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => setOpenSections((p) => ({ ...p, [section.id]: !isOpen }))}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="text-[#d71920]" size={20} />
                        <h3 className="break-words text-xl font-black">{section.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-black/55">
                        {done}/{items.length} odcvičené {section.description ? `· ${section.description}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canManage && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(section.id);
                          }}
                          className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-red-700"
                        >
                          <Trash2 size={16} />
                        </span>
                      )}
                      <ChevronDown className={`transition ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/5 p-4 space-y-3">
                      {canManage && (
                        <form onSubmit={(e) => addTechnique(e, section.id)} className="grid gap-2 rounded-3xl bg-white p-3 md:grid-cols-[1fr_1fr_100px_auto]">
                          <input name="name" required placeholder="Názov techniky" className={inputClass} />
                          <input name="description" placeholder="Poznámka" className={inputClass} />
                          <input name="sort_order" type="number" placeholder="Poradie" className={inputClass} />
                          <button className="inline-flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white">
                            <Plus size={18} />
                          </button>
                        </form>
                      )}

                      {items.length === 0 ? (
                        <p className="rounded-2xl bg-white p-4 text-center text-sm font-bold text-black/50">Žiadne techniky v sekcii.</p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {items.map((technique) => {
                            const doneNow = practicedTechniqueIds.has(technique.id);
                            return (
                              <div
                                key={technique.id}
                                className={`rounded-3xl p-4 ring-1 transition ${
                                  doneNow
                                    ? "bg-green-50 ring-green-200"
                                    : "bg-white ring-black/5"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words text-lg font-black">{technique.name}</p>
                                    {technique.description && (
                                      <p className="mt-1 break-words text-sm text-black/55">{technique.description}</p>
                                    )}
                                  </div>
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => deleteTechnique(technique.id)}
                                      className="rounded-2xl bg-black/5 p-2 text-red-700"
                                    >
                                      <Trash2 size={17} />
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleTechnique(technique.id)}
                                  className={`mt-4 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl font-black active:scale-[0.98] ${
                                    doneNow
                                      ? "bg-green-600 text-white"
                                      : "bg-black/10 text-black"
                                  }`}
                                >
                                  {doneNow ? <CheckCircle2 size={20} /> : <Dumbbell size={20} />}
                                  {doneNow ? "Odcvičené" : "Označiť"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setSelectedDojoId("");
          setSelectedTrainingId("");
          setPracticeDate(today());
          loadLogsAndTrainings();
        }}
        className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
      >
        <RefreshCcw size={20} /> Reset výberu
      </button>
    </div>
  );
}

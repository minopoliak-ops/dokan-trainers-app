"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  CheckCircle2,
  Filter,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const colors = [
  { key: "red", label: "Červená", dot: "bg-red-500", bg: "bg-red-50", ring: "ring-red-100" },
  { key: "green", label: "Zelená", dot: "bg-green-500", bg: "bg-green-50", ring: "ring-green-100" },
  { key: "blue", label: "Modrá", dot: "bg-blue-500", bg: "bg-blue-50", ring: "ring-blue-100" },
  { key: "yellow", label: "Žltá", dot: "bg-yellow-400", bg: "bg-yellow-50", ring: "ring-yellow-100" },
  { key: "purple", label: "Fialová", dot: "bg-purple-500", bg: "bg-purple-50", ring: "ring-purple-100" },
];

const categories = [
  { key: "general", label: "Všeobecné" },
  { key: "dojo", label: "Dojo" },
  { key: "student", label: "Žiak" },
  { key: "health", label: "Zdravie" },
  { key: "organization", label: "Organizácia" },
];

function colorStyle(color: string) {
  return colors.find((c) => c.key === color) || colors[0];
}

function categoryLabel(category: string) {
  return categories.find((c) => c.key === category)?.label || "Všeobecné";
}

function formatDate(date?: string | null) {
  if (!date) return "Bez dátumu";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;

  return value.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotesPage() {
  const { permissions } = usePermissions();

  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("red");
  const [category, setCategory] = useState("general");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadNotes() {
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainer_notes")
      .select("*, trainers(full_name, email)")
      .order("updated_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setNotes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function addNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;
    if (!permissions?.id) return alert("Nie si prihlásený ako tréner.");
    if (!note.trim()) return alert("Napíš poznámku.");

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.from("trainer_notes").insert({
      trainer_id: permissions.id,
      title: title.trim() || null,
      note: note.trim(),
      color,
      category,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) return alert(error.message);

    setTitle("");
    setNote("");
    setColor("red");
    setCategory("general");
    await loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm("Vymazať poznámku?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_notes").delete().eq("id", id);

    if (error) return alert(error.message);

    await loadNotes();
  }

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase().trim();

    return notes.filter((n) => {
      if (categoryFilter && n.category !== categoryFilter) return false;
      if (colorFilter && n.color !== colorFilter) return false;

      if (!q) return true;

      return [
        n.title,
        n.note,
        n.color,
        n.category,
        categoryLabel(n.category),
        n.trainers?.full_name,
        n.trainers?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [notes, search, categoryFilter, colorFilter]);

  const stats = useMemo(() => {
    const mine = notes.filter((n) => n.trainer_id === permissions?.id).length;
    const health = notes.filter((n) => n.category === "health").length;
    const organization = notes.filter((n) => n.category === "organization").length;

    return { total: notes.length, mine, health, organization };
  }, [notes, permissions?.id]);

  const inputClass =
    "h-[56px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none transition focus:border-[#d71920] focus:bg-white";

  const textareaClass =
    "min-h-[130px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-[16px] font-semibold outline-none transition focus:border-[#d71920] focus:bg-white";

  const labelClass = "mb-2 block text-sm font-black text-black/55";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
          <div className="p-6">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
              <StickyNote size={28} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Interný blok
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Poznámky trénerov
            </h1>

            <p className="mt-3 max-w-2xl text-white/65">
              Spoločné farebné poznámky pre trénerov, dojo, žiakov, zdravie a organizáciu.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Všetky poznámky</p>
                <p className="text-3xl font-black">{stats.total}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Moje poznámky</p>
                <p className="text-3xl font-black">{stats.mine}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Zdravie</p>
                <p className="text-3xl font-black">{stats.health}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Organizácia</p>
                <p className="text-3xl font-black">{stats.organization}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="flex w-full items-center justify-between gap-4 text-left active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d71920] text-white">
                <Plus />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Nová poznámka
                </p>
                <h2 className="text-2xl font-black">Pridať poznámku</h2>
              </div>
            </div>
            <span className="shrink-0 rounded-2xl bg-[#111] px-4 py-3 text-sm font-black text-white">
              {showForm ? "Zavrieť" : "Otvoriť"}
            </span>
          </button>

          {showForm && (
            <form onSubmit={addNote} className="mt-5 grid gap-4">
              <div>
                <label className={labelClass}>Nadpis</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nadpis poznámky"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Kategória</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Farba</label>
                  <select value={color} onChange={(e) => setColor(e.target.value)} className={inputClass}>
                    {colors.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Text poznámky</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Poznámka..."
                  rows={5}
                  className={textareaClass}
                />
              </div>

              <div className="rounded-[26px] bg-[#f7f2e8] p-4">
                <p className="mb-3 text-sm font-black text-black/55">Náhľad poznámky</p>
                <div className={`rounded-3xl p-4 ring-1 ${colorStyle(color).bg} ${colorStyle(color).ring}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${colorStyle(color).dot}`} />
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black text-black/60">
                        {categoryLabel(category)}
                      </span>
                      <h3 className="mt-2 break-words text-xl font-black">
                        {title.trim() || "Bez nadpisu"}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-black/70">
                        {note.trim() || "Text poznámky sa zobrazí tu."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={saving}
                className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-60"
              >
                <Sparkles size={20} />
                {saving ? "Ukladám..." : "Pridať poznámku"}
              </button>
            </form>
          )}
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
              <Filter />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">Vyhľadávanie</p>
              <h2 className="text-2xl font-black">Filter poznámok</h2>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Vyhľadať poznámky, autora, kategóriu..."
                className={`${inputClass} pl-11`}
              />
            </div>

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
              <option value="">Všetky kategórie</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className={inputClass}>
              <option value="">Všetky farby</option>
              {colors.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">Zoznam</p>
              <h2 className="text-2xl font-black">Poznámky</h2>
            </div>
            <span className="rounded-2xl bg-[#f7f2e8] px-4 py-2 text-sm font-black text-black/60">
              {filteredNotes.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-[#f7f2e8] p-6 text-center font-bold text-black/55">
              Načítavam poznámky...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-3xl bg-[#f7f2e8] p-6 text-center text-black/55">
              Žiadne poznámky pre aktuálny filter.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredNotes.map((n) => {
                const mine = n.trainer_id === permissions?.id;
                const isAdmin = !!permissions?.can_manage_trainers;
                const style = colorStyle(n.color || "red");

                return (
                  <div key={n.id} className={`min-w-0 overflow-hidden rounded-[28px] p-5 shadow-sm ring-1 ${style.bg} ${style.ring}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className={`mt-1 h-4 w-4 shrink-0 rounded-full ${style.dot}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1 text-xs font-black text-black/60">
                              <Tag size={13} />
                              {categoryLabel(n.category)}
                            </span>
                            {mine && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#111] px-3 py-1 text-xs font-black text-white">
                                <CheckCircle2 size={13} />
                                Moja
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 break-words text-2xl font-black">
                            {n.title || "Bez nadpisu"}
                          </h3>

                          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-black/45">
                            <UserRound size={14} />
                            <span className="min-w-0 truncate">
                              {n.trainers?.full_name || n.trainers?.email || "Tréner"} · {formatDate(n.updated_at || n.created_at)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {(mine || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => deleteNote(n.id)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-black shadow-sm active:scale-[0.96]"
                          aria-label="Vymazať poznámku"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/60 p-4">
                      <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-relaxed text-black/75">
                        {n.note}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

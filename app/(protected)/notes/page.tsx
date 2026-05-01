"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { FormEvent, useEffect, useState } from "react";

const colors = [
  { key: "red", label: "Červená", dot: "bg-red-500", bg: "bg-red-50" },
  { key: "green", label: "Zelená", dot: "bg-green-500", bg: "bg-green-50" },
  { key: "blue", label: "Modrá", dot: "bg-blue-500", bg: "bg-blue-50" },
  { key: "yellow", label: "Žltá", dot: "bg-yellow-400", bg: "bg-yellow-50" },
  { key: "purple", label: "Fialová", dot: "bg-purple-500", bg: "bg-purple-50" },
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

export default function NotesPage() {
  const { permissions } = usePermissions();

  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("red");
  const [category, setCategory] = useState("general");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadNotes() {
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

  async function addNote(e: FormEvent) {
    e.preventDefault();

    if (!permissions?.id) return alert("Nie si prihlásený ako tréner.");
    if (!note.trim()) return alert("Napíš poznámku.");

    const supabase = createClient();

    const { error } = await supabase.from("trainer_notes").insert({
      trainer_id: permissions.id,
      title: title.trim() || null,
      note: note.trim(),
      color,
      category,
      updated_at: new Date().toISOString(),
    });

    if (error) return alert(error.message);

    setTitle("");
    setNote("");
    setColor("red");
    setCategory("general");
    loadNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm("Vymazať poznámku?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_notes").delete().eq("id", id);

    if (error) return alert(error.message);

    loadNotes();
  }

  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase().trim();
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

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-lg">
        <p className="text-sm text-white/60">Interný blok</p>
        <h1 className="mt-1 text-3xl font-extrabold">Poznámky trénerov</h1>
        <p className="mt-2 text-white/70">
          Spoločné farebné poznámky pre trénerov, dojo a organizáciu.
        </p>
      </div>

      <form
        onSubmit={addNote}
        className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nadpis poznámky"
          className="w-full rounded-xl border px-4 py-3"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            {colors.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Poznámka..."
          rows={4}
          className="w-full rounded-xl border px-4 py-3"
        />

        <button className="w-full rounded-xl bg-[#d71920] px-4 py-3 font-bold text-white">
          + Pridať poznámku
        </button>
      </form>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Vyhľadať poznámky..."
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            Načítavam poznámky...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            Žiadne poznámky.
          </div>
        ) : (
          filteredNotes.map((n) => {
            const mine = n.trainer_id === permissions?.id;
            const isAdmin = !!permissions?.can_manage_trainers;
            const style = colorStyle(n.color || "red");

            return (
              <div
                key={n.id}
                className={`rounded-3xl p-5 shadow-sm ring-1 ring-black/10 ${style.bg}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full ${style.dot}`}
                    />

                    <div className="min-w-0">
                      <div className="mb-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-black/60">
                        {categoryLabel(n.category)}
                      </div>

                      <h2 className="text-xl font-extrabold">
                        {n.title || "Bez nadpisu"}
                      </h2>

                      <p className="mt-1 text-xs text-black/45">
                        {n.trainers?.full_name || n.trainers?.email || "Tréner"} ·{" "}
                        {new Date(n.updated_at || n.created_at).toLocaleString(
                          "sk-SK"
                        )}
                      </p>
                    </div>
                  </div>

                  {(mine || isAdmin) && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-black active:scale-[0.96]"
                    >
                      Vymazať
                    </button>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-black/80">{n.note}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
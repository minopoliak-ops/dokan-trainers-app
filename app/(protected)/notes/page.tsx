"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { FormEvent, useEffect, useState } from "react";

export default function NotesPage() {
  const { permissions } = usePermissions();
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
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
      updated_at: new Date().toISOString(),
    });

    if (error) return alert(error.message);

    setTitle("");
    setNote("");
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

    return [n.title, n.note, n.trainers?.full_name, n.trainers?.email]
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
          Spoločné poznámky pre trénerov, dojo a organizáciu.
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

            return (
              <div
                key={n.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
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

                  {(mine || isAdmin) && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="rounded-xl bg-black/10 px-3 py-2 text-sm font-bold text-black active:scale-[0.96]"
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
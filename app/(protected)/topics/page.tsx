"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function TopicsPage() {
  const { permissions } = usePermissions();

  const canManageTopics =
    !!permissions?.can_manage_topics || !!permissions?.can_manage_trainers;

  const [topics, setTopics] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const supabase = createClient();

    const [topicsResult, materialsResult] = await Promise.all([
      supabase.from("training_topics").select("*").order("name"),
      supabase
        .from("training_topic_materials")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (topicsResult.error) return alert(topicsResult.error.message);
    if (materialsResult.error) return alert(materialsResult.error.message);

    setTopics(topicsResult.data || []);
    setMaterials(materialsResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (canManageTopics) loadData();
  }, [canManageTopics]);

  if (permissions && !canManageTopics) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš oprávnenie spravovať témy.
        </div>
      </div>
    );
  }

  async function addTopic(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!name) return;

    const { error } = await supabase.from("training_topics").insert({
      name,
      description,
      active: true,
    });

    if (error) return alert(error.message);

    formElement.reset();
    loadData();
  }

  async function deleteTopic(id: string) {
    if (
      !confirm(
        "Naozaj chceš odstrániť túto tému? Vymažú sa aj všetky jej materiály."
      )
    ) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("training_topics")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  async function addMaterial(e: FormEvent<HTMLFormElement>, topicId: string) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const title = String(form.get("title") || "").trim();
    const content = String(form.get("content") || "").trim();
    const materialUrl = String(form.get("material_url") || "").trim();

    if (!title) return alert("Zadaj názov materiálu.");

    const { error } = await supabase.from("training_topic_materials").insert({
      topic_id: topicId,
      title,
      content: content || null,
      material_url: materialUrl || null,
    });

    if (error) return alert(error.message);

    formElement.reset();
    loadData();
  }

  async function updateMaterial(e: FormEvent<HTMLFormElement>, materialId: string) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const title = String(form.get("title") || "").trim();
    const content = String(form.get("content") || "").trim();
    const materialUrl = String(form.get("material_url") || "").trim();

    if (!title) return alert("Zadaj názov materiálu.");

    const { error } = await supabase
      .from("training_topic_materials")
      .update({
        title,
        content: content || null,
        material_url: materialUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", materialId);

    if (error) return alert(error.message);

    setEditingMaterialId(null);
    loadData();
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Vymazať tento materiál?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_topic_materials")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  async function markMaterialCompleted(material: any) {
    const supabase = createClient();

    const { error } = await supabase
      .from("training_topic_materials")
      .update({
        completed_count: (material.completed_count || 0) + 1,
        last_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", material.id);

    if (error) return alert(error.message);

    loadData();
  }

  function toggleTopic(topicId: string) {
    setExpandedTopics((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId]
    );
  }

  function getTopicMaterials(topicId: string) {
    const q = search.toLowerCase().trim();

    return materials
      .filter((m) => m.topic_id === topicId)
      .filter((m) => {
        if (!q) return true;

        return [m.title, m.content, m.material_url]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }

  const totalMaterials = materials.length;
  const completedTotal = useMemo(() => {
    return materials.reduce(
      (sum, item) => sum + Number(item.completed_count || 0),
      0
    );
  }, [materials]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <BookOpen size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Tréningová knižnica
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Tréningové témy
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Témy, materiály, cvičenia a podklady pre trénerov na tréningu.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Počet tém</p>
              <p className="text-3xl font-black">{topics.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Materiály</p>
              <p className="text-3xl font-black">{totalMaterials}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prebraté spolu</p>
              <p className="text-3xl font-black">{completedTotal}</p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={addTopic}
        className="grid gap-3 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 md:grid-cols-3"
      >
        <input
          name="name"
          required
          placeholder="Názov témy"
          className="rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
        />

        <input
          name="description"
          placeholder="Krátky popis témy"
          className="rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
        />

        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]">
          <Plus size={20} />
          Pridať tému
        </button>
      </form>

      <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-3 flex items-center gap-2">
          <Search size={18} className="text-black/40" />
          <p className="text-sm font-bold text-black/60">
            Vyhľadávanie v materiáloch
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadaj názov materiálu, obsah alebo link..."
          className="w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 outline-none"
        />
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Načítavam témy...
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Zatiaľ nemáš žiadne témy.
        </div>
      ) : (
        <div className="grid gap-4">
          {topics.map((topic) => {
            const topicMaterials = getTopicMaterials(topic.id);
            const expanded = expandedTopics.includes(topic.id);

            return (
              <div
                key={topic.id}
                className="overflow-hidden rounded-[30px] bg-white shadow-sm ring-1 ring-black/10"
              >
                <button
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                      Téma
                    </p>

                    <h2 className="mt-1 text-2xl font-black">{topic.name}</h2>

                    <p className="mt-1 text-sm text-black/55">
                      {topic.description || "Bez popisu"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f7f2e8] px-3 py-1 text-xs font-bold text-black/60">
                        {topicMaterials.length} materiálov
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTopic(topic.id);
                      }}
                      className="rounded-2xl bg-black/10 p-3 hover:bg-red-100"
                    >
                      <Trash2 size={20} />
                    </button>

                    <div className="rounded-2xl bg-[#f7f2e8] p-3">
                      {expanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-black/10 bg-[#faf7ef] p-5">
                    <form
                      onSubmit={(e) => addMaterial(e, topic.id)}
                      className="mb-5 grid gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/10"
                    >
                      <h3 className="text-lg font-black">
                        Pridať materiál / cvičenie
                      </h3>

                      <input
                        name="title"
                        required
                        placeholder="Názov materiálu alebo cvičenia"
                        className="rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                      />

                      <textarea
                        name="content"
                        rows={4}
                        placeholder="Obsah, postup, kombinácie, poznámky pre trénera..."
                        className="rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                      />

                      <input
                        name="material_url"
                        placeholder="Link na materiál, video, PDF alebo stránku"
                        className="rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                      />

                      <button className="rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]">
                        + Pridať kartu materiálu
                      </button>
                    </form>

                    {topicMaterials.length === 0 ? (
                      <div className="rounded-3xl bg-white p-6 text-center text-black/55 shadow-sm">
                        Táto téma zatiaľ nemá žiadne materiály.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {topicMaterials.map((material) => {
                          const editing = editingMaterialId === material.id;

                          if (editing) {
                            return (
                              <form
                                key={material.id}
                                onSubmit={(e) => updateMaterial(e, material.id)}
                                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-3"
                              >
                                <input
                                  name="title"
                                  defaultValue={material.title}
                                  required
                                  className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                                />

                                <textarea
                                  name="content"
                                  defaultValue={material.content || ""}
                                  rows={5}
                                  className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                                />

                                <input
                                  name="material_url"
                                  defaultValue={material.material_url || ""}
                                  className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 outline-none"
                                />

                                <div className="grid gap-2 md:grid-cols-2">
                                  <button className="rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white">
                                    Uložiť zmeny
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditingMaterialId(null)}
                                    className="rounded-2xl bg-black/10 px-4 py-3 font-bold"
                                  >
                                    Zrušiť
                                  </button>
                                </div>
                              </form>
                            );
                          }

                          return (
                            <div
                              key={material.id}
                              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10"
                            >
                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                                    Materiál
                                  </p>

                                  <h3 className="mt-1 text-xl font-black">
                                    {material.title}
                                  </h3>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingMaterialId(material.id)
                                    }
                                    className="rounded-xl bg-black/10 p-2"
                                  >
                                    <Pencil size={18} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteMaterial(material.id)}
                                    className="rounded-xl bg-black/10 p-2 hover:bg-red-100"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                              </div>

                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/75">
                                {material.content || "Bez obsahu."}
                              </p>

                              {material.material_url && (
                                <a
                                  href={material.material_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 py-3 font-bold text-white active:scale-[0.98]"
                                >
                                  Otvoriť materiál
                                  <ExternalLink size={18} />
                                </a>
                              )}

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => markMaterialCompleted(material)}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 font-bold text-white active:scale-[0.98]"
                                >
                                  <CheckCircle2 size={18} />
                                  Označiť prebraté
                                </button>

                                <div className="rounded-2xl bg-[#f7f2e8] px-4 py-3 text-sm">
                                  <p className="font-bold text-black/60">
                                    Prebraté: {material.completed_count || 0}×
                                  </p>
                                  <p className="text-xs text-black/45">
                                    {material.last_completed_at
                                      ? new Date(
                                          material.last_completed_at
                                        ).toLocaleString("sk-SK")
                                      : "Zatiaľ neprebraté"}
                                  </p>
                                </div>
                              </div>
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
  );
}
"use client";

import { createClient } from "@/lib/supabase/browser";
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function TopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);

  async function loadTopics() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("training_topics")
      .select("*")
      .order("name");

    if (error) {
      alert(error.message);
      return;
    }

    setTopics(data || []);
  }

  useEffect(() => {
    loadTopics();
  }, []);

  async function addTopic(e: React.FormEvent<HTMLFormElement>) {
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

  if (error) {
    alert(error.message);
    return;
  }

  formElement.reset();
  loadTopics();
}

  async function deleteTopic(id: string) {
    if (!confirm("Naozaj chceš odstrániť túto tému?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_topics")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadTopics();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tréningové témy</h1>
        <p className="mt-2 text-white/70">
          Témy, ktoré sa potom dajú vybrať pri prezenčke.
        </p>
      </div>

      <form
        onSubmit={addTopic}
        className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:grid-cols-3"
      >
        <input
          name="name"
          required
          placeholder="Názov témy"
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="description"
          placeholder="Popis"
          className="rounded-xl border px-4 py-3"
        />

        <button className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white">
          + Pridať tému
        </button>
      </form>

      <div className="grid gap-3">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/10"
          >
            <div>
              <p className="text-xl font-bold">{topic.name}</p>
              <p className="text-black/60">{topic.description || "Bez popisu"}</p>
            </div>

            <button
              onClick={() => deleteTopic(topic.id)}
              className="rounded-xl bg-black/10 p-3 hover:bg-red-100"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        {topics.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            Zatiaľ nemáš žiadne témy.
          </div>
        )}
      </div>
    </div>
  );
}

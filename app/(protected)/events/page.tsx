"use client";

import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  async function loadData() {
    const supabase = createClient();

    const eventsRes = await supabase
      .from("events")
      .select("*, dojos(name), trainers(full_name), training_topics(name)")
      .order("start_date", { ascending: false });

    const dojosRes = await supabase.from("dojos").select("*");
    const topicsRes = await supabase.from("training_topics").select("*");
    const trainersRes = await supabase.from("trainers").select("*");

    setEvents(eventsRes.data || []);
    setDojos(dojosRes.data || []);
    setTopics(topicsRes.data || []);
    setTrainers(trainersRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const { error } = await supabase.from("events").insert({
      name: form.get("name"),
      type: form.get("type"),
      start_date: form.get("start_date"),
      end_date: form.get("end_date") || null,
      dojo_id: form.get("dojo_id") || null,
      topic_id: form.get("topic_id") || null,
      trainer_id: form.get("trainer_id") || null,
    });

    if (error) return alert(error.message);

    formElement.reset();
    loadData();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Vymazať akciu?")) return;

    const supabase = createClient();
    await supabase.from("events").delete().eq("id", id);

    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Semináre a akcie</h1>
      </div>

      <form
        onSubmit={addEvent}
        className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:grid-cols-2"
      >
        <input
          name="name"
          placeholder="Názov akcie"
          className="rounded-xl border px-4 py-3"
          required
        />

        <select name="type" className="rounded-xl border px-4 py-3">
          <option value="seminar">Seminár</option>
          <option value="camp">Tábor</option>
        </select>

        <input type="date" name="start_date" className="rounded-xl border px-4 py-3" required />
        <input type="date" name="end_date" className="rounded-xl border px-4 py-3" />

        <select name="dojo_id" className="rounded-xl border px-4 py-3">
          <option value="">Dojo</option>
          {dojos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select name="topic_id" className="rounded-xl border px-4 py-3">
          <option value="">Téma</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select name="trainer_id" className="rounded-xl border px-4 py-3">
          <option value="">Tréner</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>

        <button className="col-span-2 rounded-xl bg-brand-red px-4 py-3 font-bold text-white">
          + Vytvoriť akciu
        </button>
      </form>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Zoznam akcií</h2>

        {events.length === 0 ? (
          <p>Zatiaľ nemáš žiadne akcie.</p>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-2xl border p-4"
              >
                <div>
                  <p className="text-lg font-bold">{event.name}</p>
                  <p className="text-sm text-black/60">
                    {event.start_date} {event.end_date && `– ${event.end_date}`}
                  </p>
                  <p className="text-sm text-black/60">
                    {event.dojos?.name || "Bez dojo"} ·{" "}
                    {event.training_topics?.name || "Bez témy"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-xl bg-black px-4 py-2 text-white"
                  >
                    Detail
                  </Link>

                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-white"
                  >
                    Vymazať
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

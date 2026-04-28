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

  const inputClass =
  "box-border h-[52px] w-full max-w-full min-w-0 appearance-none rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px] outline-none transition focus:border-[#d71920] focus:bg-white";

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6 overflow-x-hidden">
      <div className="rounded-[28px] bg-[#111111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Semináre a akcie
        </h1>
      </div>

      <form
        onSubmit={addEvent}
        className="grid grid-cols-1 gap-3 overflow-hidden rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:grid-cols-2"
      >
        <input
          name="name"
          placeholder="Názov akcie"
          className={inputClass}
          required
        />

        <select name="type" className={inputClass}>
          <option value="seminar">Seminár</option>
          <option value="camp">Tábor</option>
        </select>

        <input
          type="date"
          name="start_date"
          className={inputClass}
          required
        />

        <input type="date" name="end_date" className={inputClass} />

        <select name="dojo_id" className={inputClass}>
          <option value="">Dojo</option>
          {dojos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select name="topic_id" className={inputClass}>
          <option value="">Téma</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select name="trainer_id" className={inputClass}>
          <option value="">Tréner</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>

        <button className="h-[54px] w-full rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98] sm:col-span-2">
          + Vytvoriť akciu
        </button>
      </form>

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <h2 className="mb-4 text-2xl font-extrabold tracking-tight">
          Zoznam akcií
        </h2>

        {events.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/60">
            Zatiaľ nemáš žiadne akcie.
          </p>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <p className="text-lg font-extrabold leading-tight text-[#111]">
                  {event.name}
                </p>

                <p className="mt-2 text-sm text-black/60">
                  {event.start_date}
                  {event.end_date && ` – ${event.end_date}`}
                </p>

                <p className="mt-1 text-sm text-black/60">
                  {event.dojos?.name || "Bez dojo"} ·{" "}
                  {event.training_topics?.name || "Bez témy"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-4 font-bold text-white active:scale-[0.98]"
                  >
                    Detail
                  </Link>

                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="h-11 rounded-2xl bg-[#d71920] px-4 font-bold text-white active:scale-[0.98]"
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
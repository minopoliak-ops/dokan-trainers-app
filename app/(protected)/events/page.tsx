"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function EventsPage() {
  const { permissions, dojoIds } = usePermissions();

  const [events, setEvents] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const isAdmin = !!permissions?.can_manage_trainers;

  async function loadData() {
    if (!permissions) return;

    const supabase = createClient();

    let eventsQuery = supabase
      .from("events")
      .select("*, dojos(name), trainers(full_name), training_topics(name)")
      .order("start_date", { ascending: false });

    let dojosQuery = supabase.from("dojos").select("*").order("name");

    if (!isAdmin) {
      if (dojoIds.length === 0) {
        setEvents([]);
        setDojos([]);
        return;
      }

      eventsQuery = eventsQuery.in("dojo_id", dojoIds);
      dojosQuery = dojosQuery.in("id", dojoIds);
    }

    const [eventsRes, dojosRes, topicsRes, trainersRes] = await Promise.all([
      eventsQuery,
      dojosQuery,
      supabase.from("training_topics").select("*").order("name"),
      supabase.from("trainers").select("*").order("full_name"),
    ]);

    if (eventsRes.error) console.error(eventsRes.error);
    if (dojosRes.error) console.error(dojosRes.error);
    if (topicsRes.error) console.error(topicsRes.error);
    if (trainersRes.error) console.error(trainersRes.error);

    setEvents(eventsRes.data || []);
    setDojos(dojosRes.data || []);
    setTopics(topicsRes.data || []);
    setTrainers(trainersRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, [permissions, dojoIds]);

  async function addEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const dojoId = String(form.get("dojo_id") || "");

    if (!isAdmin && !dojoIds.includes(dojoId)) {
      alert("Nemáš oprávnenie vytvárať akciu pre toto dojo.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("events").insert({
      name: form.get("name"),
      event_type: form.get("type"),
      start_date: form.get("start_date"),
      end_date: form.get("end_date") || null,
      dojo_id: dojoId || null,
      topic_id: form.get("topic_id") || null,
      trainer_id: form.get("trainer_id") || null,
    });

    if (error) return alert(error.message);

    formElement.reset();
    loadData();
  }

  async function deleteEvent(id: string) {
    if (!isAdmin) {
      alert("Nemáš oprávnenie mazať akcie.");
      return;
    }

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
        {!isAdmin && (
          <p className="mt-2 text-sm text-white/70">
            Zobrazuješ iba akcie pre svoje priradené dojo.
          </p>
        )}
      </div>

      {(isAdmin || permissions?.can_create_trainings) && (
        <form
          onSubmit={addEvent}
          className="grid grid-cols-1 gap-3 overflow-hidden rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
        >
          <input
            name="name"
            placeholder="Názov akcie"
            className={inputClass}
            required
          />

          <select name="type" className={inputClass}>
            <option value="kids_seminar">Detský seminár</option>
            <option value="older_seminar">Seminár pre starších</option>
            <option value="day_camp">Denný tábor</option>
            <option value="sleepover_camp_1">Prespávací tábor 1</option>
            <option value="sleepover_camp_2">Prespávací tábor 2</option>
            <option value="training">Tréning</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-black/50">Dátum od</span>
              <input
                type="date"
                name="start_date"
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-black/50">Dátum do</span>
              <input type="date" name="end_date" className={inputClass} />
            </div>
          </div>

          <select name="dojo_id" className={inputClass} required>
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

          <button className="h-[54px] w-full rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]">
            + Vytvoriť akciu
          </button>
        </form>
      )}

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
                <p className="text-lg font-extrabold text-[#111]">
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

                <div className={`mt-4 grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-4 font-bold text-white active:scale-[0.98]"
                  >
                    Detail
                  </Link>

                  {isAdmin && (
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="h-11 rounded-2xl bg-[#d71920] px-4 font-bold text-white active:scale-[0.98]"
                    >
                      Vymazať
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
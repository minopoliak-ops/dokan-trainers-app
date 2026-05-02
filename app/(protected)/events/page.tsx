"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const eventTypeLabels: Record<string, string> = {
  kids_seminar: "Detský seminár",
  older_seminar: "Seminár pre starších",
  day_camp: "Denný tábor",
  sleepover_camp_1: "Prespávací tábor 1",
  sleepover_camp_2: "Prespávací tábor 2",
  training: "Tréning",
};

const eventTypeStyles: Record<string, string> = {
  kids_seminar: "bg-blue-50 text-blue-800 ring-blue-100",
  older_seminar: "bg-purple-50 text-purple-800 ring-purple-100",
  day_camp: "bg-amber-50 text-amber-900 ring-amber-100",
  sleepover_camp_1: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  sleepover_camp_2: "bg-green-50 text-green-800 ring-green-100",
  training: "bg-red-50 text-red-800 ring-red-100",
};

function formatDate(date?: string | null) {
  if (!date) return "Bez dátumu";

  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return date;

  return value.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EventsPage() {
  const { permissions, dojoIds } = usePermissions();

  const [events, setEvents] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [filterDojoId, setFilterDojoId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateMode, setDateMode] = useState<"upcoming" | "all" | "past">("upcoming");

  const isAdmin = !!permissions?.can_manage_trainers;
  const canCreateEvents = !!permissions?.can_create_trainings || isAdmin;

  async function loadData() {
    if (!permissions) return;

    setLoading(true);

    const supabase = createClient();

    let eventsQuery = supabase
      .from("events")
      .select("*, dojos(name), trainers(full_name), training_topics(name)")
      .order("start_date", { ascending: false });

    let dojosQuery = supabase.from("dojos").select("*").order("name");

    if (!isAdmin) {
      if (!dojoIds || dojoIds.length === 0) {
        setEvents([]);
        setDojos([]);
        setTopics([]);
        setTrainers([]);
        setLoading(false);
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

    if (eventsRes.error) alert(eventsRes.error.message);
    if (dojosRes.error) alert(dojosRes.error.message);
    if (topicsRes.error) console.error(topicsRes.error.message);
    if (trainersRes.error) console.error(trainersRes.error.message);

    setEvents(eventsRes.data || []);
    setDojos(dojosRes.data || []);
    setTopics(topicsRes.data || []);
    setTrainers(trainersRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [permissions, dojoIds]);

  async function addEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canCreateEvents) {
      alert("Nemáš oprávnenie vytvárať akcie.");
      return;
    }

    if (creating) return;

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const name = String(form.get("name") || "").trim();
    const eventType = String(form.get("type") || "kids_seminar").trim();
    const startDate = String(form.get("start_date") || "").trim();
    const endDate = String(form.get("end_date") || "").trim();
    const dojoId = String(form.get("dojo_id") || "").trim();
    const topicId = String(form.get("topic_id") || "").trim();
    const trainerId = String(form.get("trainer_id") || "").trim();

    if (!name) return alert("Zadaj názov akcie.");
    if (!startDate) return alert("Vyber dátum začiatku.");
    if (!dojoId) return alert("Vyber dojo.");

    if (endDate && endDate < startDate) {
      alert("Dátum do nemôže byť pred dátumom od.");
      return;
    }

    if (!isAdmin && !dojoIds.includes(dojoId)) {
      alert("Nemáš oprávnenie vytvárať akciu pre toto dojo.");
      return;
    }

    setCreating(true);

    const supabase = createClient();

    const { error } = await supabase.from("events").insert({
      name,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || null,
      dojo_id: dojoId,
      topic_id: topicId || null,
      trainer_id: trainerId || null,
    });

    setCreating(false);

    if (error) return alert(error.message);

    formElement.reset();
    setShowForm(false);
    await loadData();
  }

  async function deleteEvent(id: string) {
    if (!isAdmin) {
      alert("Nemáš oprávnenie mazať akcie.");
      return;
    }

    if (!id) return alert("Chýba ID akcie.");
    if (!confirm("Vymazať akciu? Vymaže sa aj jej prezenčka.")) return;

    const supabase = createClient();

    const { error: attendanceError } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", id);

    if (attendanceError) return alert(attendanceError.message);

    const { error: externalError } = await supabase
      .from("event_external_participants")
      .delete()
      .eq("event_id", id);

    if (externalError) console.error(externalError.message);

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) return alert(error.message);

    await loadData();
  }

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();
    const today = todayIso();

    return events.filter((event) => {
      if (filterDojoId && event.dojo_id !== filterDojoId) return false;
      if (filterType && event.event_type !== filterType) return false;

      const eventEnd = event.end_date || event.start_date;

      if (dateMode === "upcoming" && eventEnd < today) return false;
      if (dateMode === "past" && eventEnd >= today) return false;

      if (!q) return true;

      const text = [
        event.name,
        event.start_date,
        event.end_date,
        event.dojos?.name,
        event.trainers?.full_name,
        event.training_topics?.name,
        eventTypeLabels[event.event_type] || event.event_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [events, search, filterDojoId, filterType, dateMode]);

  const stats = useMemo(() => {
    const today = todayIso();

    return {
      total: events.length,
      upcoming: events.filter((event) => (event.end_date || event.start_date) >= today)
        .length,
      past: events.filter((event) => (event.end_date || event.start_date) < today)
        .length,
      dojos: new Set(events.map((event) => event.dojo_id).filter(Boolean)).size,
    };
  }, [events]);

  const inputClass =
    "h-[56px] w-full min-w-0 rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none transition focus:border-[#d71920] focus:bg-white";

  const labelClass = "mb-2 block text-sm font-black text-black/55";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
          <div className="p-6">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
              <Trophy size={28} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              DOKAN akcie
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Semináre a akcie
            </h1>

            <p className="mt-3 max-w-2xl text-white/65">
              Moderný prehľad seminárov, táborov, tréningov a prezenčky podľa dojo.
              {!isAdmin && " Zobrazuješ iba akcie pre svoje priradené dojo."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Všetky akcie</p>
                <p className="text-3xl font-black">{stats.total}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Nadchádzajúce</p>
                <p className="text-3xl font-black">{stats.upcoming}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Ukončené</p>
                <p className="text-3xl font-black">{stats.past}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-white/50">Dojo v akciách</p>
                <p className="text-3xl font-black">{stats.dojos}</p>
              </div>
            </div>
          </div>
        </div>

        {canCreateEvents && (
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
                    Nová akcia
                  </p>
                  <h2 className="text-2xl font-black">Vytvoriť akciu</h2>
                </div>
              </div>

              <span className="shrink-0 rounded-2xl bg-[#111] px-4 py-3 text-sm font-black text-white">
                {showForm ? "Zavrieť" : "Otvoriť"}
              </span>
            </button>

            {showForm && (
              <form onSubmit={addEvent} className="mt-5 grid gap-4">
                <div>
                  <label className={labelClass}>Názov akcie</label>
                  <input
                    name="name"
                    placeholder="Napr. Detský seminár, tábor, skúšky..."
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Typ akcie</label>
                    <select name="type" className={inputClass}>
                      <option value="kids_seminar">Detský seminár</option>
                      <option value="older_seminar">Seminár pre starších</option>
                      <option value="day_camp">Denný tábor</option>
                      <option value="sleepover_camp_1">Prespávací tábor 1</option>
                      <option value="sleepover_camp_2">Prespávací tábor 2</option>
                      <option value="training">Tréning</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Dátum od</label>
                    <input type="date" name="start_date" className={inputClass} required />
                  </div>

                  <div>
                    <label className={labelClass}>Dátum do</label>
                    <input type="date" name="end_date" className={inputClass} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Dojo</label>
                    <select name="dojo_id" className={inputClass} required>
                      <option value="">Vyber dojo</option>
                      {dojos.map((dojo) => (
                        <option key={dojo.id} value={dojo.id}>
                          {dojo.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Téma</label>
                    <select name="topic_id" className={inputClass}>
                      <option value="">Bez témy</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Tréner</label>
                    <select name="trainer_id" className={inputClass}>
                      <option value="">Bez trénera</option>
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>
                          {trainer.full_name || trainer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  disabled={creating}
                  className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-60"
                >
                  <Sparkles size={20} />
                  {creating ? "Vytváram..." : "Vytvoriť akciu"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
              <Filter />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                Prehľad
              </p>
              <h2 className="text-2xl font-black">Filter akcií</h2>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hľadaj názov, dojo, trénera alebo tému..."
                className={`${inputClass} pl-11`}
              />
            </div>

            <select
              value={filterDojoId}
              onChange={(e) => setFilterDojoId(e.target.value)}
              className={inputClass}
            >
              <option value="">Všetky dojo</option>
              {dojos.map((dojo) => (
                <option key={dojo.id} value={dojo.id}>
                  {dojo.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={inputClass}
            >
              <option value="">Všetky typy</option>
              {Object.entries(eventTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl bg-[#f7f2e8] p-2">
            <button
              type="button"
              onClick={() => setDateMode("upcoming")}
              className={`rounded-2xl px-3 py-3 text-sm font-black active:scale-[0.98] ${
                dateMode === "upcoming" ? "bg-[#111] text-white" : "bg-white text-black"
              }`}
            >
              Budúce
            </button>

            <button
              type="button"
              onClick={() => setDateMode("all")}
              className={`rounded-2xl px-3 py-3 text-sm font-black active:scale-[0.98] ${
                dateMode === "all" ? "bg-[#111] text-white" : "bg-white text-black"
              }`}
            >
              Všetky
            </button>

            <button
              type="button"
              onClick={() => setDateMode("past")}
              className={`rounded-2xl px-3 py-3 text-sm font-black active:scale-[0.98] ${
                dateMode === "past" ? "bg-[#111] text-white" : "bg-white text-black"
              }`}
            >
              Staré
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                Zoznam
              </p>
              <h2 className="text-2xl font-black">Akcie</h2>
            </div>

            <span className="rounded-2xl bg-[#f7f2e8] px-4 py-2 text-sm font-black text-black/60">
              {filteredEvents.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-[#f7f2e8] p-6 text-center font-bold text-black/55">
              Načítavam akcie...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl bg-[#f7f2e8] p-6 text-center text-black/55">
              Žiadne akcie pre aktuálny filter.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredEvents.map((event) => {
                const typeLabel =
                  eventTypeLabels[event.event_type] || event.event_type || "Akcia";

                const typeStyle =
                  eventTypeStyles[event.event_type] ||
                  "bg-black/5 text-black/70 ring-black/10";

                return (
                  <div
                    key={event.id}
                    className="min-w-0 overflow-hidden rounded-[26px] bg-[#f7f2e8] p-4 ring-1 ring-black/5"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${typeStyle}`}
                        >
                          {typeLabel}
                        </span>

                        <h3 className="mt-3 break-words text-2xl font-black text-[#111]">
                          {event.name}
                        </h3>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#d71920] shadow-sm">
                        <CalendarDays />
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-black/60">
                      <p className="flex items-center gap-2">
                        <CalendarDays size={16} className="shrink-0" />
                        <span className="font-bold text-black/75">
                          {formatDate(event.start_date)}
                          {event.end_date ? ` – ${formatDate(event.end_date)}` : ""}
                        </span>
                      </p>

                      <p className="flex items-center gap-2">
                        <Users size={16} className="shrink-0" />
                        <span>
                          {event.dojos?.name || "Bez dojo"} ·{" "}
                          {event.training_topics?.name || "Bez témy"}
                        </span>
                      </p>

                      <p className="flex items-center gap-2">
                        <UserRound size={16} className="shrink-0" />
                        <span>{event.trainers?.full_name || "Bez trénera"}</span>
                      </p>
                    </div>

                    <div className={`mt-5 grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
                      >
                        <ClipboardList size={18} />
                        Detail
                        <ChevronRight size={18} />
                      </Link>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteEvent(event.id)}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white active:scale-[0.98]"
                        >
                          <Trash2 size={18} />
                          Vymazať
                        </button>
                      )}
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

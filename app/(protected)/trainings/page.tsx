"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function TrainingsPage() {
  const { permissions } = usePermissions();

  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [search, setSearch] = useState("");
  const [expandedTrainings, setExpandedTrainings] = useState<string[]>([]);
  const [showTrainingList, setShowTrainingList] = useState(false);

  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [deleteWorking, setDeleteWorking] = useState(false);

  const isAdmin = !!permissions?.can_manage_trainers;

  async function loadTrainings() {
    if (!permissions) return;

    setLoading(true);
    const supabase = createClient();

    if (isAdmin) {
      const { data, error } = await supabase
        .from("trainings")
        .select("*, dojos(name), training_topics(name)")
        .order("training_date", { ascending: false });

      if (error) {
        setLoading(false);
        return alert(error.message);
      }

      setTrainings(data || []);
      setLoading(false);
      return;
    }

    const { data: links, error: linksError } = await supabase
      .from("trainer_dojos")
      .select("dojo_id")
      .eq("trainer_id", permissions.id);

    if (linksError) {
      setLoading(false);
      return alert(linksError.message);
    }

    const dojoIds = (links || []).map((d: any) => d.dojo_id);

    if (dojoIds.length === 0) {
      setTrainings([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("trainings")
      .select("*, dojos(name), training_topics(name)")
      .in("dojo_id", dojoIds)
      .order("training_date", { ascending: false });

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    setTrainings(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrainings();
  }, [permissions, isAdmin]);

  const dojoCards = useMemo(() => {
    const map: Record<string, any> = {};

    trainings.forEach((training) => {
      const dojoId = training.dojo_id || "unknown";

      if (!map[dojoId]) {
        map[dojoId] = {
          id: dojoId,
          name: training.dojos?.name || "Bez dojo",
          trainings: [],
        };
      }

      map[dojoId].trainings.push(training);
    });

    return Object.values(map).sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name))
    );
  }, [trainings]);

  const selectedDojo = useMemo(() => {
    if (!selectedDojoId) return null;
    return dojoCards.find((dojo: any) => dojo.id === selectedDojoId);
  }, [dojoCards, selectedDojoId]);

  const filteredTrainings = useMemo(() => {
    const source = selectedDojo ? selectedDojo.trainings : trainings;
    const q = search.toLowerCase().trim();

    if (!q) return source;

    return source.filter((training: any) => {
      const text = [
        training.training_date,
        training.title,
        training.dojos?.name,
        training.training_topics?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [selectedDojo, trainings, search]);

  const latestThree = useMemo(() => {
    const source = selectedDojo ? selectedDojo.trainings : trainings;
    return source.slice(0, 3);
  }, [selectedDojo, trainings]);

  const deleteCandidates = useMemo(() => {
    if (!deleteFrom || !deleteTo) return [];

    const source = selectedDojo ? selectedDojo.trainings : trainings;

    return source.filter((training: any) => {
      return (
        training.training_date >= deleteFrom &&
        training.training_date <= deleteTo
      );
    });
  }, [deleteFrom, deleteTo, selectedDojo, trainings]);

  function toggleTraining(id: string) {
    setExpandedTrainings((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function deleteTraining(training: any) {
    if (!isAdmin) return alert("Iba admin môže vymazávať tréningy.");

    const ok = confirm(
      `Naozaj vymazať tréning?\n\n${training.training_date} — ${training.title}\n\nVymaže sa aj prezenčka a história tohto tréningu.`
    );

    if (!ok) return;

    const supabase = createClient();

    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .eq("training_id", training.id);

    if (attendanceError) return alert(attendanceError.message);

    const { error: trainingError } = await supabase
      .from("trainings")
      .delete()
      .eq("id", training.id);

    if (trainingError) return alert(trainingError.message);

    await loadTrainings();
  }

  async function deleteTrainingRange() {
    if (!isAdmin) return alert("Iba admin môže vymazávať tréningy.");
    if (!deleteFrom || !deleteTo) return alert("Vyber rozsah dátumov.");
    if (deleteFrom > deleteTo) return alert("Dátum OD nemôže byť po dátume DO.");
    if (deleteCandidates.length === 0) return alert("V tomto rozsahu nie sú tréningy.");

    const scope = selectedDojo ? selectedDojo.name : "všetky dojo";

    const ok = confirm(
      `Naozaj vymazať tréningy od ${deleteFrom} do ${deleteTo}?\n\n` +
        `Rozsah: ${scope}\n` +
        `Počet tréningov: ${deleteCandidates.length}\n\n` +
        `Vymaže sa aj prezenčka a história týchto tréningov.`
    );

    if (!ok) return;

    setDeleteWorking(true);

    const ids = deleteCandidates.map((training: any) => training.id);
    const supabase = createClient();

    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .in("training_id", ids);

    if (attendanceError) {
      setDeleteWorking(false);
      return alert(attendanceError.message);
    }

    const { error: trainingsError } = await supabase
      .from("trainings")
      .delete()
      .in("id", ids);

    setDeleteWorking(false);

    if (trainingsError) return alert(trainingsError.message);

    setDeleteFrom("");
    setDeleteTo("");
    setExpandedTrainings([]);
    await loadTrainings();
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Dumbbell size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Prehľad tréningov
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">Tréningy</h1>

          <p className="mt-3 max-w-2xl text-white/65">
            {isAdmin
              ? "Prehľad všetkých tréningov rozdelený podľa dojo."
              : "Zobrazené sú len tréningy tvojich priradených dojo."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
          Načítavam tréningy...
        </div>
      ) : trainings.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
          Žiadne tréningy pre tvoje dojo.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dojoCards.map((dojo: any) => {
              const active = selectedDojoId === dojo.id;
              const lastTraining = dojo.trainings[0];

              return (
                <button
                  type="button"
                  key={dojo.id}
                  onClick={() => {
                    setSelectedDojoId(active ? "" : dojo.id);
                    setSearch("");
                    setExpandedTrainings([]);
                    setShowTrainingList(false);
                  }}
                  className={`text-left rounded-[28px] p-5 shadow-sm ring-1 transition active:scale-[0.98] ${
                    active
                      ? "bg-[#111] text-white ring-[#111]"
                      : "bg-white text-black ring-black/10"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        active ? "bg-[#d71920]" : "bg-[#f7f2e8]"
                      }`}
                    >
                      <CalendarCheck
                        className={active ? "text-white" : "text-[#d71920]"}
                        size={24}
                      />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        active ? "bg-white/15 text-white" : "bg-black/5"
                      }`}
                    >
                      {dojo.trainings.length} tréningov
                    </span>
                  </div>

                  <h2 className="text-2xl font-black">{dojo.name}</h2>

                  <p className={`mt-2 text-sm ${active ? "text-white/60" : "text-black/55"}`}>
                    Posledný tréning:{" "}
                    <b>
                      {lastTraining
                        ? formatDate(lastTraining.training_date)
                        : "žiadny"}
                    </b>
                  </p>

                  <p className={`mt-1 text-sm ${active ? "text-white/60" : "text-black/55"}`}>
                    {lastTraining?.training_topics?.name || "Bez témy"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  {selectedDojo ? "Vybrané dojo" : "Všetky dojo"}
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  {selectedDojo ? selectedDojo.name : "Všetky tréningy"}
                </h2>

                <p className="mt-1 text-sm text-black/55">
                  {selectedDojo
                    ? `Tréningy iba pre ${selectedDojo.name}`
                    : "Najnovšie tréningy zo všetkých dojo"}
                </p>
              </div>

              {selectedDojoId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDojoId("");
                    setSearch("");
                    setExpandedTrainings([]);
                    setShowTrainingList(false);
                  }}
                  className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white active:scale-[0.97]"
                >
                  Zobraziť všetky dojo
                </button>
              )}
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-lg font-black">Posledné 3 tréningy</h3>

              <div className="grid gap-3 md:grid-cols-3">
                {latestThree.length === 0 ? (
                  <div className="rounded-2xl bg-[#f7f2e8] p-4 text-sm text-black/60">
                    Žiadne tréningy.
                  </div>
                ) : (
                  latestThree.map((training: any) => (
                    <Link
                      key={training.id}
                      href={`/dojos/${training.dojo_id}/attendance`}
                      className="rounded-2xl bg-[#f7f2e8] p-4 ring-1 ring-black/5 active:scale-[0.98]"
                    >
                      <p className="text-sm font-bold text-black/45">
                        {formatDate(training.training_date)}
                      </p>
                      <h4 className="mt-1 font-black">{training.title}</h4>
                      <p className="mt-1 text-sm text-black/55">
                        {training.dojos?.name || "Bez dojo"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setShowTrainingList((v) => !v)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div>
                  <h3 className="text-xl font-black">
                    Zoznam tréningov ({filteredTrainings.length})
                  </h3>
                  <p className="text-sm text-black/50">
                    Rozbaliť, vyhľadávať a spravovať tréningy.
                  </p>
                </div>

                <div className="rounded-xl bg-[#f7f2e8] p-2">
                  {showTrainingList ? <ChevronUp /> : <ChevronDown />}
                </div>
              </button>

              {showTrainingList && (
                <div className="border-t border-black/10 p-5">
                  <div className="mb-5 rounded-2xl bg-[#f7f2e8] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Search size={18} className="text-black/40" />
                      <p className="text-sm font-bold text-black/60">
                        Vyhľadávanie tréningov
                      </p>
                    </div>

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Hľadaj dátum, názov, dojo alebo tému..."
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  {isAdmin && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Trash2 size={18} className="text-red-700" />
                        <p className="font-black text-red-800">
                          Vymazanie tréningov podľa rozsahu
                        </p>
                      </div>

                      <p className="mb-4 text-sm text-red-800/80">
                        Vymaže tréningy aj ich prezenčku. Tým sa odstránia aj z histórie.
                        {selectedDojo
                          ? ` Platí iba pre dojo ${selectedDojo.name}.`
                          : " Platí pre všetky zobrazené dojo."}
                      </p>

                      <div className="grid gap-3 md:grid-cols-4">
                        <input
                          type="date"
                          value={deleteFrom}
                          onChange={(e) => setDeleteFrom(e.target.value)}
                          className="rounded-xl border border-red-200 bg-white px-4 py-3"
                        />

                        <input
                          type="date"
                          value={deleteTo}
                          onChange={(e) => setDeleteTo(e.target.value)}
                          className="rounded-xl border border-red-200 bg-white px-4 py-3"
                        />

                        <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-red-800">
                          Na vymazanie: {deleteCandidates.length}
                        </div>

                        <button
                          type="button"
                          onClick={deleteTrainingRange}
                          disabled={deleteWorking || deleteCandidates.length === 0}
                          className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-40"
                        >
                          {deleteWorking ? "Mažem..." : "Vymazať rozsah"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {filteredTrainings.length === 0 ? (
                      <div className="rounded-2xl bg-[#f7f2e8] p-6 text-center text-black/60">
                        Nenašli sa žiadne tréningy.
                      </div>
                    ) : (
                      filteredTrainings.map((training: any) => {
                        const expanded = expandedTrainings.includes(training.id);

                        return (
                          <div
                            key={training.id}
                            className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => toggleTraining(training.id)}
                              className="flex w-full items-center justify-between gap-4 p-4 text-left active:scale-[0.99]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-black/45">
                                  {formatDate(training.training_date)}
                                </p>
                                <h4 className="truncate text-lg font-black">
                                  {training.title}
                                </h4>
                                <p className="truncate text-sm text-black/55">
                                  {training.dojos?.name || "Bez dojo"} ·{" "}
                                  {training.training_topics?.name || "Bez témy"}
                                </p>
                              </div>

                              <div className="shrink-0 rounded-xl bg-[#f7f2e8] p-2">
                                {expanded ? <ChevronUp /> : <ChevronDown />}
                              </div>
                            </button>

                            {expanded && (
                              <div className="border-t border-black/10 bg-[#faf7ef] p-4">
                                <div className="grid gap-3 text-sm md:grid-cols-3">
                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-black/45">Dátum</p>
                                    <p className="font-black">
                                      {formatDate(training.training_date)}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-black/45">Dojo</p>
                                    <p className="font-black">
                                      {training.dojos?.name || "Bez dojo"}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white p-4">
                                    <p className="text-black/45">Téma</p>
                                    <p className="font-black">
                                      {training.training_topics?.name || "Bez témy"}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <Link
                                    href={`/dojos/${training.dojo_id}/attendance`}
                                    className="inline-flex items-center justify-center rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]"
                                  >
                                    Otvoriť prezenčku
                                  </Link>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => deleteTraining(training)}
                                      className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 font-bold text-white active:scale-[0.98]"
                                    >
                                      Vymazať tréning aj históriu
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
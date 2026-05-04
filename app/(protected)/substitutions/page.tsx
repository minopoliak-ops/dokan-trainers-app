"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Handshake,
  Mail,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type SubstitutionStatus = "open" | "accepted" | "cancelled" | "closed";

type SubstitutionRequest = {
  id: string;
  requester_id: string | null;
  substitute_id: string | null;
  dojo_id: string | null;
  training_id: string | null;
  request_date: string;
  end_date: string | null;
  status: SubstitutionStatus | string | null;
  note: string | null;
  topics_note: string | null;
  created_at: string | null;
  dojos?: { name?: string | null } | null;
  requester?: { full_name?: string | null; email?: string | null } | null;
  substitute?: { full_name?: string | null; email?: string | null } | null;
  trainings?: {
    id?: string | null;
    title?: string | null;
    training_date?: string | null;
    training_topics?: { name?: string | null } | null;
  } | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date?: string | null) {
  if (!date) return "Bez dátumu";
  return new Date(date).toLocaleDateString("sk-SK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(status?: string | null) {
  if (status === "accepted") return "Prevzaté";
  if (status === "cancelled") return "Zrušené";
  if (status === "closed") return "Uzatvorené";
  return "Otvorené";
}

function statusClass(status?: string | null) {
  if (status === "accepted") return "bg-green-100 text-green-800 ring-green-200";
  if (status === "cancelled") return "bg-red-100 text-red-800 ring-red-200";
  if (status === "closed") return "bg-black/10 text-black/60 ring-black/10";
  return "bg-amber-100 text-amber-900 ring-amber-200";
}

export default function SubstitutionsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [requests, setRequests] = useState<SubstitutionRequest[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [requestDate, setRequestDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [topicsNote, setTopicsNote] = useState("");

  const [filter, setFilter] = useState<"open" | "mine" | "accepted" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = !!permissions?.can_manage_trainers;
  const canCreate =
    isAdmin ||
    !!permissions?.can_create_trainings ||
    !!permissions?.can_attendance ||
    !!permissions?.can_manage_topics;

  async function loadData() {
    if (permissionsLoading) return;

    setLoading(true);
    const supabase = createClient();

    const [requestsRes, dojosRes, trainingsRes, trainersRes] = await Promise.all([
      supabase
        .from("training_substitution_requests")
        .select(
          `
          *,
          dojos(name),
          requester:trainers!training_substitution_requests_requester_id_fkey(full_name,email),
          substitute:trainers!training_substitution_requests_substitute_id_fkey(full_name,email),
          trainings(id,title,training_date,training_topics(name))
        `
        )
        .order("request_date", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("dojos").select("*").order("name"),
      supabase
        .from("trainings")
        .select("id,title,training_date,dojo_id,dojos(name),training_topics(name)")
        .gte("training_date", today())
        .order("training_date", { ascending: true })
        .limit(120),
      supabase.from("trainers").select("id,full_name,email,active").eq("active", true).order("full_name"),
    ]);

    if (requestsRes.error) alert(requestsRes.error.message);
    if (dojosRes.error) console.error(dojosRes.error.message);
    if (trainingsRes.error) console.error(trainingsRes.error.message);
    if (trainersRes.error) console.error(trainersRes.error.message);

    setRequests(requestsRes.data || []);
    setDojos(dojosRes.data || []);
    setTrainings(trainingsRes.data || []);
    setTrainers(trainersRes.data || []);

    if (!selectedDojoId && (dojosRes.data || []).length > 0) {
      setSelectedDojoId(dojosRes.data![0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const supabase = createClient();

    const channel = supabase
      .channel("substitutions-page-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_substitution_requests",
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissionsLoading, permissions?.id]);

  useEffect(() => {
    const training = trainings.find((t) => t.id === selectedTrainingId);
    if (training?.dojo_id) setSelectedDojoId(training.dojo_id);
    if (training?.training_date) {
      setRequestDate(training.training_date);
      setEndDate("");
    }
  }, [selectedTrainingId]);

  const openCount = requests.filter((r) => r.status === "open").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const myAcceptedCount = requests.filter(
    (r) => r.status === "accepted" && r.substitute_id === permissions?.id
  ).length;

  const trainerEmails = useMemo(() => {
    return trainers
      .map((trainer) => String(trainer.email || "").trim())
      .filter(Boolean)
      .join(",");
  }, [trainers]);

  const mailHref = useMemo(() => {
    const subject = "DOKAN - prosba o zastupovanie tréningu";
    const appUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/substitutions`
        : "https://app.dokanbratislava.online/substitutions";

    const body = `Ahojte,

v aplikácii DOKAN Trénerská zóna je nová žiadosť o zastupovanie tréningu.

Prosím otvorte aplikáciu a potvrďte, kto vie tréning prevziať:
${appUrl}

Ďakujem.`;

    return `mailto:${trainerEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [trainerEmails]);

  const visibleRequests = useMemo(() => {
    if (filter === "open") return requests.filter((r) => r.status === "open");
    if (filter === "accepted") return requests.filter((r) => r.status === "accepted");
    if (filter === "mine") {
      return requests.filter(
        (r) => r.requester_id === permissions?.id || r.substitute_id === permissions?.id
      );
    }
    return requests;
  }, [filter, requests, permissions?.id]);

  async function createRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canCreate) {
      alert("Nemáš oprávnenie vytvoriť žiadosť o zastupovanie.");
      return;
    }

    if (!selectedDojoId) return alert("Vyber dojo.");
    if (!requestDate) return alert("Vyber dátum.");

    setSaving(true);
    const supabase = createClient();

    const payload = {
      requester_id: permissions?.id || null,
      substitute_id: null,
      dojo_id: selectedDojoId,
      training_id: selectedTrainingId || null,
      request_date: requestDate,
      end_date: endDate || null,
      status: "open",
      note: note.trim() || null,
      topics_note: topicsNote.trim() || null,
    };

    const { error } = await supabase.from("training_substitution_requests").insert(payload);

    setSaving(false);

    if (error) return alert(error.message);

    setSelectedTrainingId("");
    setRequestDate(today());
    setEndDate("");
    setNote("");
    setTopicsNote("");
    setFilter("open");
    loadData();
  }

  async function acceptRequest(request: SubstitutionRequest) {
    if (!permissions?.id) return alert("Nie si prihlásený.");
    if (request.requester_id === permissions.id) {
      return alert("Nemôžeš prevziať vlastnú žiadosť.");
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({
        substitute_id: permissions.id,
        status: "accepted",
      })
      .eq("id", request.id)
      .eq("status", "open");

    if (error) return alert(error.message);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? { ...item, substitute_id: permissions.id, status: "accepted" }
          : item
      )
    );
  }

  async function reopenRequest(request: SubstitutionRequest) {
    if (!isAdmin && request.requester_id !== permissions?.id) {
      return alert("Znovu otvoriť žiadosť môže iba autor alebo admin.");
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({
        substitute_id: null,
        status: "open",
      })
      .eq("id", request.id);

    if (error) return alert(error.message);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === request.id
          ? { ...item, substitute_id: null, status: "open" }
          : item
      )
    );
  }

  async function cancelRequest(request: SubstitutionRequest) {
    if (!isAdmin && request.requester_id !== permissions?.id) {
      return alert("Zrušiť žiadosť môže iba autor alebo admin.");
    }

    if (!confirm("Zrušiť túto žiadosť o zastupovanie?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id);

    if (error) return alert(error.message);

    setRequests((prev) =>
      prev.map((item) =>
        item.id === request.id ? { ...item, status: "cancelled" } : item
      )
    );
  }

  async function deleteRequest(request: SubstitutionRequest) {
    if (!isAdmin && request.requester_id !== permissions?.id) {
      return alert("Vymazať žiadosť môže iba autor alebo admin.");
    }

    if (!confirm("Vymazať žiadosť natrvalo?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .delete()
      .eq("id", request.id);

    if (error) return alert(error.message);

    setRequests((prev) => prev.filter((item) => item.id !== request.id));
  }

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 font-bold shadow-sm">
          Načítavam zastupovanie...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <Handshake size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Zastupovanie tréningov
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Kto môže zobrať tréning?
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Tréner vytvorí žiadosť, ostatní ju vidia hneď bez refreshu.
            Po potvrdení záskoku sa zastupujúcemu otvorí prezenčka pre dané dojo a deň.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Otvorené</p>
              <p className="text-3xl font-black text-amber-300">{openCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Prevzaté</p>
              <p className="text-3xl font-black text-green-300">{acceptedCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Moje záskoky</p>
              <p className="text-3xl font-black text-indigo-300">{myAcceptedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {openCount > 0 && (
        <div className="rounded-[30px] bg-indigo-600 p-5 text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <BellRing size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-white/65">
                Live upozornenie
              </p>

              <h2 className="mt-1 text-2xl font-black">Treba zastúpiť tréning</h2>

              <p className="mt-1 font-semibold text-white/80">
                Aktuálne je otvorených {openCount} žiadostí. Zmena sa aktualizuje automaticky.
              </p>

              {trainerEmails && (
                <a
                  href={mailHref}
                  className="mt-4 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98] md:w-auto"
                >
                  <Send size={18} />
                  Poslať email trénerom
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {canCreate && (
        <form
          onSubmit={createRequest}
          className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f2e8] text-indigo-600">
              <Plus />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                Nová žiadosť
              </p>
              <h2 className="text-2xl font-black">Požiadať o zastupovanie</h2>
              <p className="mt-1 text-sm font-semibold text-black/55">
                Vyber dojo, deň alebo konkrétny tréning a dopíš, čo treba prebrať.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={selectedTrainingId}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-indigo-600 focus:bg-white"
            >
              <option value="">Bez konkrétneho tréningu</option>
              {trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {formatDate(training.training_date)} ·{" "}
                  {training.dojos?.name || "Dojo"} ·{" "}
                  {training.training_topics?.name || training.title || "Tréning"}
                </option>
              ))}
            </select>

            <select
              value={selectedDojoId}
              onChange={(e) => setSelectedDojoId(e.target.value)}
              className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-indigo-600 focus:bg-white"
            >
              <option value="">Vyber dojo</option>
              {dojos.map((dojo) => (
                <option key={dojo.id} value={dojo.id}>
                  {dojo.name}
                </option>
              ))}
            </select>

            <div>
              <label className="mb-2 block text-sm font-black text-black/55">
                Dátum záskoku
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-black/55">
                Do dátumu / voliteľné
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <textarea
            value={topicsNote}
            onChange={(e) => setTopicsNote(e.target.value)}
            placeholder="Témy a techniky, ktoré treba prebrať..."
            className="min-h-[100px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 font-semibold outline-none focus:border-indigo-600 focus:bg-white"
          />

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Poznámka pre trénera, ktorý zoberie záskok..."
            className="min-h-[90px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 font-semibold outline-none focus:border-indigo-600 focus:bg-white"
          />

          <button
            disabled={saving}
            className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 font-black text-white shadow-[0_8px_18px_rgba(79,70,229,0.25)] active:scale-[0.98] disabled:opacity-60"
          >
            <BellRing size={20} />
            {saving ? "Ukladám..." : "Zverejniť žiadosť o záskok"}
          </button>
        </form>
      )}

      <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/10 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Žiadosti
            </p>
            <h2 className="text-2xl font-black">Zastupovanie</h2>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
          >
            <RefreshCcw size={17} />
            Obnoviť
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { key: "open", label: "Otvorené" },
            { key: "accepted", label: "Prevzaté" },
            { key: "mine", label: "Moje" },
            { key: "all", label: "Všetko" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key as any)}
              className={`h-12 rounded-2xl font-black active:scale-[0.98] ${
                filter === item.key
                  ? "bg-[#111] text-white"
                  : "bg-[#f7f2e8] text-black/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleRequests.length === 0 ? (
          <div className="rounded-[26px] bg-[#f7f2e8] p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black/50">
              <AlertCircle />
            </div>
            <p className="font-black">Žiadne žiadosti v tomto filtri.</p>
            <p className="mt-1 text-sm font-semibold text-black/50">
              Keď tréner pridá záskok, zobrazí sa tu automaticky.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleRequests.map((request) => {
              const canAccept =
                request.status === "open" &&
                permissions?.id &&
                request.requester_id !== permissions.id;

              const canManage =
                isAdmin || request.requester_id === permissions?.id;

              const attendanceHref = request.dojo_id
                ? `/dojos/${request.dojo_id}/attendance`
                : "/dojos";

              return (
                <div
                  key={request.id}
                  className={`overflow-hidden rounded-[28px] ring-1 ${
                    request.status === "accepted"
                      ? "bg-green-50 ring-green-200"
                      : request.status === "open"
                      ? "bg-[#f7f2e8] ring-amber-200"
                      : "bg-[#f7f2e8] ring-black/5"
                  }`}
                >
                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(
                          request.status
                        )}`}
                      >
                        {statusLabel(request.status)}
                      </span>

                      <p className="text-sm font-black text-black/45">
                        {formatDate(request.request_date)}
                        {request.end_date ? ` – ${formatDate(request.end_date)}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                              request.status === "accepted"
                                ? "bg-green-600 text-white"
                                : "bg-indigo-600 text-white"
                            }`}
                          >
                            {request.status === "accepted" ? (
                              <CheckCircle2 />
                            ) : (
                              <Handshake />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words text-2xl font-black">
                              {request.dojos?.name || "Dojo"}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-black/55">
                              Žiada:{" "}
                              <b>
                                {request.requester?.full_name ||
                                  request.requester?.email ||
                                  "tréner"}
                              </b>
                            </p>

                            {request.substitute_id && (
                              <p className="mt-1 text-sm font-semibold text-green-700">
                                Zobral:{" "}
                                <b>
                                  {request.substitute?.full_name ||
                                    request.substitute?.email ||
                                    "tréner"}
                                </b>
                              </p>
                            )}

                            {request.trainings?.training_topics?.name && (
                              <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-black/60">
                                {request.trainings.training_topics.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {request.topics_note && (
                          <div className="mt-4 rounded-2xl bg-white p-4">
                            <p className="mb-1 flex items-center gap-2 text-sm font-black text-black/45">
                              <Dumbbell size={16} />
                              Témy a techniky
                            </p>
                            <p className="whitespace-pre-wrap font-semibold text-black/75">
                              {request.topics_note}
                            </p>
                          </div>
                        )}

                        {request.note && (
                          <div className="mt-3 rounded-2xl bg-white/70 p-4">
                            <p className="whitespace-pre-wrap text-sm font-semibold text-black/65">
                              {request.note}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2 md:min-w-[230px]">
                        {canAccept && (
                          <button
                            type="button"
                            onClick={() => acceptRequest(request)}
                            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 font-black text-white active:scale-[0.98]"
                          >
                            <UserCheck size={19} />
                            Zobrať záskok
                          </button>
                        )}

                        {request.status === "accepted" && (
                          <Link
                            href={attendanceHref}
                            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 font-black text-white active:scale-[0.98]"
                          >
                            <ShieldCheck size={19} />
                            Otvoriť prezenčku
                          </Link>
                        )}

                        {canManage && request.status === "accepted" && (
                          <button
                            type="button"
                            onClick={() => reopenRequest(request)}
                            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-black active:scale-[0.98]"
                          >
                            <RefreshCcw size={18} />
                            Znovu otvoriť
                          </button>
                        )}

                        {canManage && request.status === "open" && (
                          <button
                            type="button"
                            onClick={() => cancelRequest(request)}
                            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-red-700 active:scale-[0.98]"
                          >
                            <XCircle size={18} />
                            Zrušiť
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => deleteRequest(request)}
                            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 font-black text-red-800 active:scale-[0.98]"
                          >
                            <Trash2 size={18} />
                            Vymazať
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[26px] bg-[#111] p-5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
          Dôležité
        </p>
        <p className="mt-2 text-lg font-black">
          Zastupujúci tréner dostane prístup len k prezenčke daného dojo
          v deň potvrdeného záskoku. Nasledujúci deň sa prístup automaticky stratí.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/more"
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-[#111] active:scale-[0.98]"
          >
            Späť do menu
          </Link>

          {trainerEmails && (
            <a
              href={mailHref}
              className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 font-black text-white active:scale-[0.98]"
            >
              <Mail size={18} />
              Email trénerom
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Handshake,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type RequestStatus = "open" | "accepted" | "cancelled" | "done";

type SubRequest = {
  id: string;
  requester_id: string;
  substitute_id: string | null;
  dojo_id: string | null;
  training_id: string | null;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  status: RequestStatus;
  note: string | null;
  topics_note: string | null;
  created_at: string;
  requester?: { full_name: string | null; email: string | null } | null;
  substitute?: { full_name: string | null; email: string | null } | null;
  dojos?: { name: string | null; address: string | null } | null;
  trainings?: { title: string | null; training_date: string | null } | null;
};

export default function SubstitutionsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [requests, setRequests] = useState<SubRequest[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [selectedDojo, setSelectedDojo] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = !!permissions?.can_manage_trainers;
  const canCreate = !!permissions?.id;

  const openRequests = useMemo(() => requests.filter((r) => r.status === "open"), [requests]);
  const myRequests = useMemo(() => requests.filter((r) => r.requester_id === permissions?.id), [requests, permissions?.id]);
  const acceptedByMe = useMemo(
    () => requests.filter((r) => r.substitute_id === permissions?.id && r.status === "accepted"),
    [requests, permissions?.id]
  );

  async function loadData() {
    if (permissionsLoading) return;

    setLoading(true);
    const supabase = createClient();

    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 14);
    const to = new Date(today);
    to.setDate(today.getDate() + 60);

    const [requestsRes, dojosRes] = await Promise.all([
      supabase
        .from("training_substitution_requests")
        .select(`
          *,
          requester:trainers!training_substitution_requests_requester_id_fkey(full_name,email),
          substitute:trainers!training_substitution_requests_substitute_id_fkey(full_name,email),
          dojos(name,address),
          trainings(title,training_date)
        `)
        .gte("request_date", from.toISOString().slice(0, 10))
        .lte("request_date", to.toISOString().slice(0, 10))
        .order("request_date", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("dojos").select("*").order("name"),
    ]);

    if (requestsRes.error) alert(requestsRes.error.message);
    if (dojosRes.error) alert(dojosRes.error.message);

    setRequests((requestsRes.data || []) as SubRequest[]);
    setDojos(dojosRes.data || []);
    setLoading(false);
  }

  async function loadTrainings() {
    const supabase = createClient();

    let query = supabase
      .from("trainings")
      .select("*, dojos(name), training_topics(name)")
      .eq("training_date", selectedDate)
      .order("training_date");

    if (selectedDojo) query = query.eq("dojo_id", selectedDojo);

    const { data, error } = await query;
    if (error) console.error(error.message);
    setTrainings(data || []);
  }

  useEffect(() => {
    loadData();
  }, [permissionsLoading]);

  useEffect(() => {
    loadTrainings();
  }, [selectedDate, selectedDojo]);

  async function createRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) return alert("Nie si prihlásený ako tréner.");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    setSaving(true);

    const { error } = await supabase.from("training_substitution_requests").insert({
      requester_id: permissions?.id,
      dojo_id: String(form.get("dojo_id") || "") || null,
      training_id: String(form.get("training_id") || "") || null,
      request_date: String(form.get("request_date") || selectedDate),
      start_time: String(form.get("start_time") || "") || null,
      end_time: String(form.get("end_time") || "") || null,
      note: String(form.get("note") || "").trim() || null,
      topics_note: String(form.get("topics_note") || "").trim() || null,
      status: "open",
    });

    setSaving(false);

    if (error) return alert(error.message);

    e.currentTarget.reset();
    setSelectedDojo("");
    setSelectedDate(new Date().toISOString().slice(0, 10));
    loadData();
  }

  async function acceptRequest(request: SubRequest) {
    if (!permissions?.id) return alert("Nie si prihlásený.");
    if (request.requester_id === permissions.id) return alert("Nemôžeš zastúpiť sám seba.");
    if (!confirm("Potvrdiť, že vieš zastúpiť tento tréning?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({
        substitute_id: permissions.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "open");

    if (error) return alert(error.message);
    loadData();
  }

  async function cancelRequest(request: SubRequest) {
    if (!confirm("Zrušiť žiadosť o zastupovanie?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id);

    if (error) return alert(error.message);
    loadData();
  }

  async function markDone(request: SubRequest) {
    const supabase = createClient();

    const { error } = await supabase
      .from("training_substitution_requests")
      .update({ status: "done" })
      .eq("id", request.id);

    if (error) return alert(error.message);
    loadData();
  }

  async function deleteRequest(id: string) {
    if (!isAdmin) return;
    if (!confirm("Vymazať žiadosť?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("training_substitution_requests").delete().eq("id", id);
    if (error) return alert(error.message);
    loadData();
  }

  function statusBadge(status: RequestStatus) {
    if (status === "accepted") return "bg-green-100 text-green-800";
    if (status === "cancelled") return "bg-black/10 text-black/50";
    if (status === "done") return "bg-blue-100 text-blue-800";
    return "bg-red-100 text-red-800";
  }

  function statusText(status: RequestStatus) {
    if (status === "accepted") return "Zastúpenie potvrdené";
    if (status === "cancelled") return "Zrušené";
    if (status === "done") return "Vybavené";
    return "Hľadá sa záskok";
  }

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 font-black shadow-sm">Načítavam zastupovanie...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[34px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Handshake size={30} />
          </div>

          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
            Zastupovanie tréningov
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Kto ma vie zastúpiť?</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Tréner zadá dátum, dojo, tréning a poznámky. Ostatní tréneri môžu záskok potvrdiť.
            Po potvrdení sa im otvorí prístup k prezenčke pre daný deň.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Otvorené žiadosti</p>
              <p className="text-3xl font-black text-red-300">{openRequests.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Moje žiadosti</p>
              <p className="text-3xl font-black">{myRequests.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Zastupujem</p>
              <p className="text-3xl font-black text-green-300">{acceptedByMe.length}</p>
            </div>
          </div>
        </div>
      </div>

      {openRequests.length > 0 && (
        <div className="rounded-[30px] bg-red-600 p-5 text-white shadow-[0_12px_28px_rgba(215,25,32,0.25)]">
          <div className="flex items-start gap-3">
            <BellRing className="mt-1 shrink-0" />
            <div>
              <h2 className="text-2xl font-black">Treba zastúpiť tréning</h2>
              <p className="mt-1 font-semibold text-white/80">
                Aktuálne je otvorených {openRequests.length} žiadostí.
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={createRequest}
        className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
            <Plus />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">Nová žiadosť</p>
            <h2 className="text-2xl font-black">Potrebujem záskok</h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            name="dojo_id"
            value={selectedDojo}
            onChange={(e) => setSelectedDojo(e.target.value)}
            className="h-[56px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-[#d71920] focus:bg-white"
          >
            <option value="">Vyber dojo</option>
            {dojos.map((dojo) => (
              <option key={dojo.id} value={dojo.id}>
                {dojo.name}
              </option>
            ))}
          </select>

          <input
            name="request_date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-[56px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-center font-black outline-none focus:border-[#d71920] focus:bg-white"
          />

          <input
            name="start_time"
            type="time"
            className="h-[56px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-center font-black outline-none focus:border-[#d71920] focus:bg-white"
          />

          <input
            name="end_time"
            type="time"
            className="h-[56px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-center font-black outline-none focus:border-[#d71920] focus:bg-white"
          />
        </div>

        <select
          name="training_id"
          className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-black outline-none focus:border-[#d71920] focus:bg-white"
        >
          <option value="">Bez konkrétneho tréningu</option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.training_date} · {training.title || "Tréning"} ·{" "}
              {training.dojos?.name || "Dojo"} · {training.training_topics?.name || "Bez témy"}
            </option>
          ))}
        </select>

        <textarea
          name="topics_note"
          rows={4}
          placeholder="Témy a techniky, ktoré treba prebrať..."
          className="min-h-[110px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-base font-semibold outline-none focus:border-[#d71920] focus:bg-white"
        />

        <textarea
          name="note"
          rows={3}
          placeholder="Poznámka pre trénera, ktorý ma bude zastupovať..."
          className="min-h-[90px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 text-base font-semibold outline-none focus:border-[#d71920] focus:bg-white"
        />

        <button
          disabled={saving}
          className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-60"
        >
          <Send size={20} />
          {saving ? "Odosielam..." : "Odoslať žiadosť o zastupovanie"}
        </button>
      </form>

      <div className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
              <Users />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">Zoznam</p>
              <h2 className="text-2xl font-black">Žiadosti o záskok</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
          >
            <RefreshCcw size={18} />
            Obnoviť
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-6 text-center font-bold text-black/55">
            Zatiaľ nie je žiadna žiadosť o zastupovanie.
          </p>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
              const mine = request.requester_id === permissions?.id;
              const acceptedByCurrentUser = request.substitute_id === permissions?.id;
              const canAccept = request.status === "open" && !mine;
              const canCancel = mine && request.status === "open";

              return (
                <div
                  key={request.id}
                  className={`overflow-hidden rounded-[28px] ring-1 ${
                    request.status === "open"
                      ? "bg-red-50 ring-red-100"
                      : request.status === "accepted"
                      ? "bg-green-50 ring-green-100"
                      : "bg-[#f7f2e8] ring-black/5"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${statusBadge(request.status)}`}>
                            {statusText(request.status)}
                          </span>
                          {mine && (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black/60">
                              Moja žiadosť
                            </span>
                          )}
                          {acceptedByCurrentUser && (
                            <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                              Zastupujem ja
                            </span>
                          )}
                        </div>

                        <h3 className="break-words text-2xl font-black">
                          {request.dojos?.name || "Bez dojo"} ·{" "}
                          {new Date(request.request_date).toLocaleDateString("sk-SK")}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-black/55">
                          <Clock className="mr-1 inline" size={15} />
                          {request.start_time || "čas neurčený"}
                          {request.end_time ? ` – ${request.end_time}` : ""}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-black/55">
                          Žiada: <b>{request.requester?.full_name || request.requester?.email || "Tréner"}</b>
                        </p>

                        {request.substitute && (
                          <p className="mt-1 text-sm font-semibold text-green-700">
                            Zastupuje: <b>{request.substitute.full_name || request.substitute.email}</b>
                          </p>
                        )}
                      </div>

                      <div className="grid shrink-0 gap-2 md:min-w-[220px]">
                        {canAccept && (
                          <button
                            type="button"
                            onClick={() => acceptRequest(request)}
                            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 font-black text-white active:scale-[0.98]"
                          >
                            <CheckCircle2 size={18} />
                            Viem zastúpiť
                          </button>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => cancelRequest(request)}
                            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-red-700 active:scale-[0.98]"
                          >
                            <X size={18} />
                            Zrušiť žiadosť
                          </button>
                        )}

                        {(mine || acceptedByCurrentUser || isAdmin) && request.status === "accepted" && (
                          <button
                            type="button"
                            onClick={() => markDone(request)}
                            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98]"
                          >
                            <Check size={18} />
                            Označiť vybavené
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteRequest(request.id)}
                            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-black/10 px-4 font-black text-black active:scale-[0.98]"
                          >
                            <Trash2 size={18} />
                            Vymazať
                          </button>
                        )}
                      </div>
                    </div>

                    {(request.topics_note || request.note) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {request.topics_note && (
                          <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
                            <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-black/35">
                              <Dumbbell size={16} />
                              Čo prebrať
                            </p>
                            <p className="whitespace-pre-wrap text-sm font-semibold text-black/75">
                              {request.topics_note}
                            </p>
                          </div>
                        )}

                        {request.note && (
                          <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
                            <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-black/35">
                              <AlertCircle size={16} />
                              Poznámka
                            </p>
                            <p className="whitespace-pre-wrap text-sm font-semibold text-black/75">
                              {request.note}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {request.status === "accepted" && (
                      <div className="mt-4 rounded-2xl bg-green-600 p-4 text-white">
                        <p className="flex items-center gap-2 font-black">
                          <ShieldCheck size={18} />
                          Prezenčka sa má sprístupniť zastupujúcemu trénerovi pre tento deň a dojo.
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/80">
                          Doplň kontrolu v attendance stránke podľa README v balíčku.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

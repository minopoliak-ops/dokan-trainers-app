"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  Crown,
  GraduationCap,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const permissions = [
  ["can_attendance", "Zapisovať prezenčku"],
  ["can_add_students", "Pridávať žiakov"],
  ["can_delete_students", "Vymazávať žiakov"],
  ["can_create_trainings", "Vytvárať tréningy"],
  ["can_view_health", "Vidieť lieky a poznámky"],
  ["can_manage_topics", "Pridávať témy"],
  ["can_view_stats", "Vidieť štatistiky"],
  ["can_send_emails", "Posielať emaily"],
  ["can_manage_trainers", "Spravovať trénerov"],
];

const menus = [
  ["dashboard", "Dashboard"],
  ["dojo", "Dojo"],
  ["students", "Žiaci"],
  ["trainers", "Tréneri"],
  ["topics", "Témy"],
  ["trainings", "Tréningy"],
  ["events", "Semináre"],
  ["stats", "Štatistiky"],
  ["emails", "Emaily"],
  ["chat", "Chat"],
  ["notes", "Poznámky"],
  ["more", "Viac"],
];

const roleLabels: Record<string, string> = {
  sensei: "Sensei / admin",
  senpai: "Senpai / tréner",
  kohai: "Kōhai / pomocník",
};

function roleBadge(role: string) {
  if (role === "sensei") {
    return "bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-black shadow-[0_6px_18px_rgba(245,158,11,0.35)]";
  }

  if (role === "senpai") return "bg-[#d71920] text-white";

  return "bg-amber-100 text-amber-900";
}

function getDefaultsForRole(role: string) {
  if (role === "sensei") {
    return {
      visible_menu: menus.map(([key]) => key),
      can_manage_trainers: true,
      can_attendance: true,
      can_add_students: true,
      can_delete_students: true,
      can_create_trainings: true,
      can_view_health: true,
      can_manage_topics: true,
      can_view_stats: true,
      can_send_emails: true,
    };
  }

  if (role === "senpai") {
    return {
      visible_menu: [
        "dashboard",
        "dojo",
        "students",
        "trainings",
        "events",
        "topics",
        "stats",
        "chat",
        "notes",
        "more",
      ],
      can_manage_trainers: false,
      can_attendance: true,
      can_add_students: true,
      can_delete_students: false,
      can_create_trainings: true,
      can_view_health: false,
      can_manage_topics: true,
      can_view_stats: true,
      can_send_emails: false,
    };
  }

  return {
    visible_menu: ["dashboard", "dojo", "students", "trainings", "chat", "more"],
    can_manage_trainers: false,
    can_attendance: true,
    can_add_students: false,
    can_delete_students: false,
    can_create_trainings: false,
    can_view_health: false,
    can_manage_topics: false,
    can_view_stats: false,
    can_send_emails: false,
  };
}

export default function TrainersPage() {
  const { permissions: myPermissions } = usePermissions();
  const isAdmin = !!myPermissions?.can_manage_trainers;

  const [trainers, setTrainers] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainerDojos, setTrainerDojos] = useState<any[]>([]);
  const [kohaiHelpers, setKohaiHelpers] = useState<any[]>([]);
  const [selectedDojoForKohai, setSelectedDojoForKohai] = useState("");

  async function loadData() {
    const supabase = createClient();

    const [trainersRes, dojosRes, trainerDojosRes, kohaiRes] =
      await Promise.all([
        supabase.from("trainers").select("*").order("full_name"),
        supabase.from("dojos").select("*").order("name"),
        supabase
          .from("trainer_dojos")
          .select("*, dojos(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("dojo_kohai_helpers")
          .select("*, dojos(name)")
          .order("created_at", { ascending: false }),
      ]);

    if (trainersRes.error) return alert(trainersRes.error.message);
    if (dojosRes.error) return alert(dojosRes.error.message);
    if (trainerDojosRes.error) return alert(trainerDojosRes.error.message);
    if (kohaiRes.error) return alert(kohaiRes.error.message);

    setTrainers(trainersRes.data || []);
    setDojos(dojosRes.data || []);
    setTrainerDojos(trainerDojosRes.data || []);
    setKohaiHelpers(kohaiRes.data || []);

    if (!selectedDojoForKohai && (dojosRes.data || []).length > 0) {
      setSelectedDojoForKohai(dojosRes.data?.[0]?.id || "");
    }
  }

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const hierarchyStats = useMemo(() => {
    return {
      sensei: trainers.filter((t) => (t.role || "senpai") === "sensei").length,
      senpai: trainers.filter((t) => (t.role || "senpai") === "senpai").length,
      kohai: kohaiHelpers.filter((k) => k.active !== false).length,
    };
  }, [trainers, kohaiHelpers]);

  if (myPermissions && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš oprávnenie spravovať trénerov.
        </div>
      </div>
    );
  }

  async function addTrainer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const role = String(form.get("role") || "senpai");
    const defaults = getDefaultsForRole(role);

    const { error } = await supabase.from("trainers").insert({
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim() || null,
      role,
      active: true,
      ...defaults,
    });

    if (error) return alert(error.message);

    formElement.reset();
    loadData();
  }

  async function updateTrainerRole(trainerId: string, role: string) {
    const supabase = createClient();
    const defaults = getDefaultsForRole(role);

    const { error } = await supabase
      .from("trainers")
      .update({
        role,
        ...defaults,
      })
      .eq("id", trainerId);

    if (error) return alert(error.message);

    loadData();
  }

  async function togglePermission(trainer: any, key: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("trainers")
      .update({ [key]: !trainer[key] })
      .eq("id", trainer.id);

    if (error) return alert(error.message);

    loadData();
  }

  async function toggleMenu(trainer: any, key: string) {
    const current = Array.isArray(trainer.visible_menu)
      ? trainer.visible_menu
      : [];

    const next = current.includes(key)
      ? current.filter((item: string) => item !== key)
      : [...current, key];

    const supabase = createClient();

    const { error } = await supabase
      .from("trainers")
      .update({ visible_menu: next })
      .eq("id", trainer.id);

    if (error) return alert(error.message);

    loadData();
  }

  async function deleteTrainer(id: string) {
    if (!confirm("Naozaj chceš odstrániť trénera?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainers").delete().eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  async function assignDojo(trainerId: string, dojoId: string) {
    if (!dojoId) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_dojos").upsert(
      {
        trainer_id: trainerId,
        dojo_id: dojoId,
      },
      { onConflict: "trainer_id,dojo_id" }
    );

    if (error) return alert(error.message);

    loadData();
  }

  async function removeTrainerDojo(linkId: string) {
    if (!confirm("Odobrať trénerovi toto dojo?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("trainer_dojos")
      .delete()
      .eq("id", linkId);

    if (error) return alert(error.message);

    loadData();
  }

  async function addKohaiHelper(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const supabase = createClient();

    const dojoId = String(form.get("dojo_id") || "").trim();
    const fullName = String(form.get("full_name") || "").trim();

    if (!dojoId) return alert("Vyber dojo.");
    if (!fullName) return alert("Zadaj meno kōhai pomocníka.");

    const { error } = await supabase.from("dojo_kohai_helpers").insert({
      dojo_id: dojoId,
      full_name: fullName,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      note: String(form.get("note") || "").trim() || null,
      active: true,
    });

    if (error) return alert(error.message);

    formElement.reset();
    setSelectedDojoForKohai(dojoId);
    loadData();
  }

  async function deleteKohaiHelper(id: string) {
    if (!confirm("Odobrať tohto kōhai pomocníka z dojo?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("dojo_kohai_helpers")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadData();
  }

  function getTrainerDojos(trainerId: string) {
    return trainerDojos.filter((link) => link.trainer_id === trainerId);
  }

  function getKohaiForDojo(dojoId: string) {
    return kohaiHelpers.filter((helper) => helper.dojo_id === dojoId);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Crown size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Hierarchia DOKAN tímu
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Tréneri a oprávnenia
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Sensei spravuje trénerov, senpai vedie tréning a kōhai pomáha pri dojo.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Sensei</p>
              <p className="text-3xl font-black">{hierarchyStats.sensei}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Senpai / tréneri</p>
              <p className="text-3xl font-black">{hierarchyStats.senpai}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Kōhai pomocníci</p>
              <p className="text-3xl font-black">{hierarchyStats.kohai}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-black">
            <Crown />
          </div>
          <h2 className="text-xl font-black">Sensei</h2>
          <p className="mt-1 text-sm text-black/55">
            Hlavný tréner a admin. Vidí všetko a spravuje celý systém.
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white">
            <ShieldCheck />
          </div>
          <h2 className="text-xl font-black">Senpai</h2>
          <p className="mt-1 text-sm text-black/55">
            Tréner alebo skúsenejší žiak. Vedie tréningy a pomáha senseiovi.
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
            <GraduationCap />
          </div>
          <h2 className="text-xl font-black">Kōhai</h2>
          <p className="mt-1 text-sm text-black/55">
            Pomocník pri dojo. Môže byť jeden alebo viacerí podľa potreby tréningu.
          </p>
        </div>
      </div>

      <form
        onSubmit={addTrainer}
        className="grid gap-3 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-xl font-black">Pridať trénera / senpaia</h2>
          <p className="mt-1 text-sm text-black/50">
            Tréner je používateľ aplikácie s vlastnými oprávneniami a menu.
          </p>
        </div>

        <input
          name="full_name"
          required
          placeholder="Meno trénera"
          className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4"
        />

        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4"
        />

        <input
          name="phone"
          placeholder="Telefón"
          className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4"
        />

        <select
          name="role"
          defaultValue="senpai"
          className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4"
        >
          <option value="sensei">Sensei / admin</option>
          <option value="senpai">Senpai / tréner</option>
          <option value="kohai">Kōhai / pomocník</option>
        </select>

        <button className="h-[54px] rounded-2xl bg-[#d71920] px-4 font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98] md:col-span-2">
          + Pridať trénera
        </button>
      </form>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
            <UserPlus />
          </div>

          <div>
            <h2 className="text-xl font-black">Kōhai pomocníci podľa dojo</h2>
            <p className="text-sm text-black/55">
              Tu pridáš mladších pomocníkov k jednotlivým dojo.
            </p>
          </div>
        </div>

        <form onSubmit={addKohaiHelper} className="mb-5 grid gap-3 md:grid-cols-2">
          <select
            name="dojo_id"
            value={selectedDojoForKohai}
            onChange={(e) => setSelectedDojoForKohai(e.target.value)}
            className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold"
          >
            <option value="">Vyber dojo</option>
            {dojos.map((dojo) => (
              <option key={dojo.id} value={dojo.id}>
                {dojo.name}
              </option>
            ))}
          </select>

          <input
            name="full_name"
            required
            placeholder="Meno kōhai pomocníka"
            className="h-[52px] rounded-2xl border border-black/10 bg-[#fafafa] px-4"
          />

          <input
            name="email"
            placeholder="Email voliteľné"
            className="h-[52px] rounded-2xl border border-black/10 bg-[#fafafa] px-4"
          />

          <input
            name="phone"
            placeholder="Telefón voliteľné"
            className="h-[52px] rounded-2xl border border-black/10 bg-[#fafafa] px-4"
          />

          <input
            name="note"
            placeholder="Poznámka, napr. pomáha pri deťoch"
            className="h-[52px] rounded-2xl border border-black/10 bg-[#fafafa] px-4 md:col-span-2"
          />

          <button className="h-[54px] rounded-2xl bg-amber-500 px-4 font-black text-white active:scale-[0.98] md:col-span-2">
            + Pridať kōhai k dojo
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dojos.map((dojo) => {
            const helpers = getKohaiForDojo(dojo.id);

            return (
              <div
                key={dojo.id}
                className="rounded-3xl bg-[#f7f2e8] p-4 ring-1 ring-black/5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                      Dojo
                    </p>
                    <h3 className="text-lg font-black">{dojo.name}</h3>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black/60">
                    {helpers.length} kōhai
                  </span>
                </div>

                {helpers.length === 0 ? (
                  <p className="rounded-2xl bg-white p-4 text-sm text-black/50">
                    Toto dojo zatiaľ nemá kōhai pomocníka.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {helpers.map((helper) => (
                      <div
                        key={helper.id}
                        className="rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{helper.full_name}</p>
                            <p className="text-sm text-black/50">
                              {helper.email || "Bez emailu"}
                            </p>
                            <p className="text-sm text-black/50">
                              {helper.phone || ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteKohaiHelper(helper.id)}
                            className="rounded-xl bg-black/10 p-2 hover:bg-red-100"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {helper.note && (
                          <p className="mt-3 rounded-xl bg-[#f7f2e8] p-3 text-sm text-black/65">
                            {helper.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5">
        {trainers.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            Zatiaľ nemáš žiadnych trénerov.
          </div>
        )}

        {trainers.map((trainer) => {
          const assigned = getTrainerDojos(trainer.id);
          const assignedIds = assigned.map((item) => item.dojo_id);
          const availableDojos = dojos.filter(
            (dojo) => !assignedIds.includes(dojo.id)
          );

          const visibleMenu = Array.isArray(trainer.visible_menu)
            ? trainer.visible_menu
            : [];

          const role = trainer.role || "senpai";

          return (
            <div
              key={trainer.id}
              className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-extrabold">
                      {trainer.full_name}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${roleBadge(
                        role
                      )}`}
                    >
                      {roleLabels[role] || role}
                    </span>
                  </div>

                  <p className="text-sm text-black/60">{trainer.email}</p>
                  <p className="text-sm text-black/60">{trainer.phone || ""}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteTrainer(trainer.id)}
                  className="rounded-2xl bg-black/10 p-3 active:scale-[0.98]"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="mb-6 rounded-3xl bg-[#f7f2e8] p-4">
                <h3 className="mb-3 font-extrabold">Úroveň v hierarchii</h3>

                <select
                  value={role}
                  onChange={(e) => updateTrainerRole(trainer.id, e.target.value)}
                  className="h-[52px] w-full rounded-2xl border border-black/10 bg-white px-4 font-bold"
                >
                  <option value="sensei">Sensei / admin</option>
                  <option value="senpai">Senpai / tréner</option>
                  <option value="kohai">Kōhai / pomocník</option>
                </select>
              </div>

              <div className="mb-6 rounded-3xl bg-[#f7f2e8] p-4">
                <h3 className="mb-3 font-extrabold">Priradené dojo</h3>

                {assigned.length === 0 ? (
                  <p className="mb-3 text-sm text-black/50">
                    Tréner nemá priradené žiadne dojo.
                  </p>
                ) : (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {assigned.map((link) => (
                      <button
                        type="button"
                        key={link.id}
                        onClick={() => removeTrainerDojo(link.id)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-black shadow-sm active:scale-[0.98]"
                      >
                        {link.dojos?.name || "Dojo"}
                        <X size={15} className="text-[#d71920]" />
                      </button>
                    ))}
                  </div>
                )}

                <select
                  defaultValue=""
                  onChange={(e) => {
                    assignDojo(trainer.id, e.target.value);
                    e.currentTarget.value = "";
                  }}
                  className="h-[52px] w-full rounded-2xl border border-black/10 bg-white px-4"
                >
                  <option value="">+ Pridať dojo trénerovi</option>
                  {availableDojos.map((dojo) => (
                    <option key={dojo.id} value={dojo.id}>
                      {dojo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 font-extrabold">Oprávnenia</h3>

                <div className="grid gap-2 md:grid-cols-2">
                  {permissions.map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => togglePermission(trainer, key)}
                      className={`rounded-2xl px-4 py-3 text-left font-semibold ${
                        trainer[key]
                          ? "bg-green-100 text-green-800"
                          : "bg-black/5 text-black/60"
                      }`}
                    >
                      {trainer[key] ? "✓ " : "○ "}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-extrabold">Viditeľné menu</h3>

                <div className="flex flex-wrap gap-2">
                  {menus.map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleMenu(trainer, key)}
                      className={`rounded-2xl px-4 py-2 font-bold ${
                        visibleMenu.includes(key)
                          ? "bg-[#d71920] text-white"
                          : "bg-black/10 text-black"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
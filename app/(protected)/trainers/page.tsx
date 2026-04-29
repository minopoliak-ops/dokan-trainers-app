"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

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
  ["stats", "Štatistiky"],
  ["emails", "Emaily"],
];

export default function TrainersPage() {
  const { permissions: myPermissions } = usePermissions();
  const isAdmin = !!myPermissions?.can_manage_trainers;

  const [trainers, setTrainers] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainerDojos, setTrainerDojos] = useState<any[]>([]);

  async function loadData() {
    const supabase = createClient();

    const [trainersRes, dojosRes, trainerDojosRes] = await Promise.all([
      supabase.from("trainers").select("*").order("full_name"),
      supabase.from("dojos").select("*").order("name"),
      supabase
        .from("trainer_dojos")
        .select("*, dojos(name)")
        .order("created_at", { ascending: false }),
    ]);

    if (trainersRes.error) return alert(trainersRes.error.message);
    if (dojosRes.error) return alert(dojosRes.error.message);
    if (trainerDojosRes.error) return alert(trainerDojosRes.error.message);

    setTrainers(trainersRes.data || []);
    setDojos(dojosRes.data || []);
    setTrainerDojos(trainerDojosRes.data || []);
  }

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

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

    const { error } = await supabase.from("trainers").insert({
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim() || null,
      active: true,
    });

    if (error) return alert(error.message);

    formElement.reset();
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
    const current = trainer.visible_menu || [];
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

  function getTrainerDojos(trainerId: string) {
    return trainerDojos.filter((link) => link.trainer_id === trainerId);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Tréneri a oprávnenia</h1>
        <p className="mt-2 text-sm text-white/70">
          Pridávanie trénerov, práva, viditeľné menu a priradené dojo.
        </p>
      </div>

      <form
        onSubmit={addTrainer}
        className="grid gap-3 rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
      >
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

        <button className="h-[54px] rounded-2xl bg-[#d71920] px-4 font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]">
          + Pridať trénera
        </button>
      </form>

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

          return (
            <div
              key={trainer.id}
              className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold">
                    {trainer.full_name}
                  </h2>
                  <p className="text-sm text-black/60">{trainer.email}</p>
                  <p className="text-sm text-black/60">{trainer.phone || ""}</p>
                </div>

                <button
                  onClick={() => deleteTrainer(trainer.id)}
                  className="rounded-2xl bg-black/10 p-3 active:scale-[0.98]"
                >
                  <Trash2 size={20} />
                </button>
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

                <div className="grid gap-2">
                  {permissions.map(([key, label]) => (
                    <button
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
                      key={key}
                      onClick={() => toggleMenu(trainer, key)}
                      className={`rounded-2xl px-4 py-2 font-bold ${
                        (trainer.visible_menu || []).includes(key)
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
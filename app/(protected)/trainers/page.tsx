"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const permissionsList = [
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
  const { permissions } = usePermissions();
  const isAdmin = !!permissions?.can_manage_trainers;

  const [trainers, setTrainers] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [trainerDojos, setTrainerDojos] = useState<any[]>([]);

  // 🔐 HARD LOCK
  if (permissions && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          ❌ Nemáš oprávnenie spravovať trénerov
        </div>
      </div>
    );
  }

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
      <div className="rounded-[28px] bg-[#111] p-6 text-white">
        <h1 className="text-3xl font-extrabold">Tréneri a oprávnenia</h1>
      </div>

      <form onSubmit={addTrainer} className="grid gap-3 bg-white p-5 rounded-3xl">
        <input name="full_name" required placeholder="Meno trénera" />
        <input name="email" required placeholder="Email" />
        <input name="phone" placeholder="Telefón" />
        <button>+ Pridať trénera</button>
      </form>

      {trainers.map((trainer) => {
        const assigned = getTrainerDojos(trainer.id);

        return (
          <div key={trainer.id} className="bg-white p-5 rounded-3xl">
            <h2>{trainer.full_name}</h2>

            {/* DOJOS */}
            <div>
              {assigned.map((link) => (
                <button key={link.id} onClick={() => removeTrainerDojo(link.id)}>
                  {link.dojos?.name} <X size={14} />
                </button>
              ))}
            </div>

            {/* PERMISSIONS */}
            <div>
              {permissionsList.map(([key, label]) => (
                <button key={key} onClick={() => togglePermission(trainer, key)}>
                  {trainer[key] ? "✓" : "○"} {label}
                </button>
              ))}
            </div>

            {/* MENU */}
            <div>
              {menus.map(([key, label]) => (
                <button key={key} onClick={() => toggleMenu(trainer, key)}>
                  {(trainer.visible_menu || []).includes(key) ? "✓" : "○"}{" "}
                  {label}
                </button>
              ))}
            </div>

            <button onClick={() => deleteTrainer(trainer.id)}>
              <Trash2 />
            </button>
          </div>
        );
      })}
    </div>
  );
}
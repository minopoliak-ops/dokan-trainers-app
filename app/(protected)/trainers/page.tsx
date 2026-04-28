"use client";

import { createClient } from "@/lib/supabase/browser";
import { Trash2 } from "lucide-react";
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
  const [trainers, setTrainers] = useState<any[]>([]);

  async function loadTrainers() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainers")
      .select("*")
      .order("full_name");

    if (error) {
      alert(error.message);
      return;
    }

    setTrainers(data || []);
  }

  useEffect(() => {
    loadTrainers();
  }, []);

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

    if (error) {
      alert(error.message);
      return;
    }

    formElement.reset();
    loadTrainers();
  }

  async function togglePermission(trainer: any, key: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("trainers")
      .update({ [key]: !trainer[key] })
      .eq("id", trainer.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadTrainers();
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

    if (error) {
      alert(error.message);
      return;
    }

    loadTrainers();
  }

  async function deleteTrainer(id: string) {
    if (!confirm("Naozaj chceš odstrániť trénera?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainers").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadTrainers();
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Tréneri a oprávnenia</h1>
        <p className="mt-2 text-white/70">
          Pridávanie trénerov, práva a viditeľné menu.
        </p>
      </div>

      <form
        onSubmit={addTrainer}
        className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:grid-cols-4"
      >
        <input
          name="full_name"
          required
          placeholder="Meno trénera"
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="phone"
          placeholder="Telefón"
          className="rounded-xl border px-4 py-3"
        />

        <button className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white">
          + Pridať trénera
        </button>
      </form>

      <div className="grid gap-5">
        {trainers.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            Zatiaľ nemáš žiadnych trénerov.
          </div>
        )}

        {trainers.map((trainer) => (
          <div
            key={trainer.id}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{trainer.full_name}</h2>
                <p className="text-black/60">{trainer.email}</p>
                <p className="text-black/60">{trainer.phone || ""}</p>
              </div>

              <button
                onClick={() => deleteTrainer(trainer.id)}
                className="rounded-xl bg-black/10 p-3 hover:bg-red-100"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 font-bold">Oprávnenia</h3>

              <div className="grid gap-2 md:grid-cols-3">
                {permissions.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => togglePermission(trainer, key)}
                    className={`rounded-xl px-4 py-3 text-left font-semibold ${
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
              <h3 className="mb-3 font-bold">Viditeľné menu</h3>

              <div className="flex flex-wrap gap-2">
                {menus.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleMenu(trainer, key)}
                    className={`rounded-xl px-4 py-2 font-bold ${
                      (trainer.visible_menu || []).includes(key)
                        ? "bg-brand-red text-white"
                        : "bg-black/10 text-black"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

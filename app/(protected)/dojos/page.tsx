"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Building2, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DojosPage() {
  const { permissions, dojoIds, loading: permissionsLoading } = usePermissions();

  const [dojos, setDojos] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!permissions?.can_manage_trainers;

  async function load() {
    if (permissionsLoading) return;

    setLoading(true);

    const supabase = createClient();

    let query = supabase
      .from("dojos")
      .select(`
        *,
        trainer_dojos (
          trainers (
            id,
            full_name,
            email
          )
        )
      `)
      .order("name");

    if (!isAdmin) {
      if (!dojoIds || dojoIds.length === 0) {
        setDojos([]);
        setLoading(false);
        return;
      }

      query = query.in("id", dojoIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Dojos load error:", error);
      alert(error.message);
      setDojos([]);
    } else {
      setDojos(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [permissionsLoading, permissions?.id, isAdmin, dojoIds]);

  async function add(e: FormEvent) {
    e.preventDefault();

    if (!isAdmin) {
      alert("Nemáš oprávnenie pridávať dojo.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("dojos").insert({
      name: name.trim(),
      address: address.trim() || null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setAddress("");
    setShowForm(false);
    load();
  }

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        Načítavam oprávnenia...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Dojo / telocvične</h1>
        <p className="mt-2 text-white/70">Vyber dojo alebo pridaj nové.</p>
      </div>

      {isAdmin && showForm && (
        <form
          onSubmit={add}
          className="rounded-3xl bg-white p-5 shadow-[0_10px_25px_rgba(0,0,0,0.08)] space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Názov dojo"
            required
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Adresa"
            className="w-full rounded-xl border px-4 py-3"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[#d71920] px-4 py-3 font-bold text-white"
            >
              Uložiť
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl bg-black/10 px-4 py-3 font-bold"
            >
              Zrušiť
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Načítavam dojo...
        </div>
      )}

      {!loading && dojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
          Nemáš priradené žiadne dojo.
        </div>
      )}

      {!loading && (
        <div className="grid gap-4">
          {dojos.map((dojo) => {
            const assignedTrainers =
              dojo.trainer_dojos
                ?.map((link: any) => link.trainers)
                .filter(Boolean) || [];

            return (
              <Link
                key={dojo.id}
                href={`/dojos/${dojo.id}`}
                className="rounded-3xl bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-black/5 active:scale-[0.98]"
              >
                <Building2 className="mb-3 text-[#d71920]" />

                <h2 className="text-xl font-bold">{dojo.name}</h2>

                {dojo.address && (
                  <p className="text-black/60">{dojo.address}</p>
                )}

                <div className="mt-4 rounded-2xl bg-[#f7f2e8] p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-black/70">
                    <UserRound size={16} />
                    Priradení tréneri
                  </p>

                  {assignedTrainers.length === 0 ? (
                    <p className="text-sm text-black/45">
                      Zatiaľ bez priradeného trénera.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedTrainers.map((trainer: any) => (
                        <span
                          key={trainer.id}
                          className="rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm"
                        >
                          {trainer.full_name || trainer.email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#d71920] text-white shadow-[0_8px_20px_rgba(215,25,32,0.4)] active:scale-[0.95]"
        >
          <Plus size={26} />
        </button>
      )}
    </div>
  );
}
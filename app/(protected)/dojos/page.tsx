"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DojosPage() {
  const { permissions } = usePermissions();

  const [dojos, setDojos] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!permissions?.can_manage_trainers;

  async function load() {
    if (!permissions) return;

    setLoading(true);

    const supabase = createClient();

    if (isAdmin) {
      const { data, error } = await supabase
        .from("dojos")
        .select("*")
        .order("name");

      if (error) alert(error.message);

      setDojos(data || []);
      setLoading(false);
      return;
    }

    const { data: links, error: linksError } = await supabase
      .from("trainer_dojos")
      .select("dojo_id")
      .eq("trainer_id", permissions.id);

    if (linksError) {
      alert(linksError.message);
      setLoading(false);
      return;
    }

    const dojoIds = (links || []).map((link: any) => link.dojo_id);

    if (dojoIds.length === 0) {
      setDojos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("dojos")
      .select("*")
      .in("id", dojoIds)
      .order("name");

    if (error) alert(error.message);

    setDojos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [permissions]);

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

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Dojo / telocvične</h1>
        <p className="mt-2 text-white/70">
          Vyber dojo alebo pridaj nové.
        </p>
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

      <div className="grid gap-4">
        {dojos.map((dojo) => (
          <Link
            key={dojo.id}
            href={`/dojos/${dojo.id}`}
            className="rounded-3xl bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-black/5 active:scale-[0.98]"
          >
            <Building2 className="mb-3 text-[#d71920]" />
            <h2 className="text-xl font-bold">{dojo.name}</h2>
            <p className="text-black/60">{dojo.address}</p>
          </Link>
        ))}
      </div>

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
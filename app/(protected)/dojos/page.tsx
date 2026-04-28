"use client";

import { createClient } from "@/lib/supabase/browser";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DojosPage() {
  const [dojos, setDojos] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("dojos").select("*").order("name");
    setDojos(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("dojos").insert({ name, address });
    if (error) alert(error.message);
    setName("");
    setAddress("");
    setShowForm(false);
    load();
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-28 space-y-6">
      {/* HEADER */}
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Dojo / telocvične</h1>
      </div>

      {/* FORM (modal style) */}
      {showForm && (
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

      {/* DOJOS */}
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

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#d71920] text-white shadow-[0_8px_20px_rgba(215,25,32,0.4)] active:scale-[0.95]"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
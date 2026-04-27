"use client";

import { createClient } from "@/lib/supabase/browser";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DojosPage() {
  const [dojos, setDojos] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("dojos").select("*").order("name");
    setDojos(data || []);
  }

  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("dojos").insert({ name, address });
    if (error) alert(error.message);
    setName("");
    setAddress("");
    load();
  }

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-brand-black p-6 text-white"><h1 className="text-3xl font-bold">Dojo / telocvične</h1></div>

      <form onSubmit={add} className="mb-6 grid gap-3 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-3">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Názov dojo" required className="rounded-xl border px-4 py-3" />
        <input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Adresa" className="rounded-xl border px-4 py-3" />
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 font-bold text-white"><Plus size={18} /> Pridať dojo</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dojos.map((dojo) => (
          <Link key={dojo.id} href={`/dojos/${dojo.id}`} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <Building2 className="mb-3 text-brand-red" />
            <h2 className="text-xl font-bold">{dojo.name}</h2>
            <p className="text-black/60">{dojo.address}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

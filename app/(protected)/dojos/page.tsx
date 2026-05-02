"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  Building2,
  CalendarCheck,
  MapPin,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function DojosPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [dojos, setDojos] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!permissions?.can_manage_trainers;

  async function load() {
    if (permissionsLoading) return;

    if (!permissions?.id) {
      setDojos([]);
      setLoading(false);
      return;
    }

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
  }, [permissionsLoading, permissions?.id, isAdmin]);

  const filteredDojos = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dojos;

    return dojos.filter((dojo) =>
      [dojo.name, dojo.address, dojo.training_schedule]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [dojos, search]);

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
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Načítavam oprávnenia...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Building2 size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            DOKAN Bratislava
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Dojo / telocvične
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            {isAdmin
              ? "Správa všetkých dojo, telocviční a tréningových miest."
              : "Tvoje priradené dojo a tréningové miesta."}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Počet dojo</p>
              <p className="text-3xl font-black">{dojos.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Zobrazené</p>
              <p className="text-3xl font-black">{filteredDojos.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Režim</p>
              <p className="text-2xl font-black">
                {isAdmin ? "Admin" : "Tréner"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative rounded-[26px] bg-white p-2 shadow-sm ring-1 ring-black/10">
          <Search
            size={20}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-black/35"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať dojo podľa názvu, adresy alebo tréningu..."
            className="h-[54px] w-full rounded-2xl bg-[#f7f2e8] pl-12 pr-4 font-bold outline-none"
          />
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 rounded-[26px] px-5 py-4 font-black shadow-sm active:scale-[0.98] ${
              showForm
                ? "bg-black/10 text-black"
                : "bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)]"
            }`}
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? "Zavrieť" : "Pridať dojo"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form
          onSubmit={add}
          className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-4"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Nové dojo
            </p>
            <h2 className="text-2xl font-black">Pridať telocvičňu</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Názov dojo"
              required
              className="h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresa"
              className="h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
            >
              <Sparkles size={18} />
              Uložiť dojo
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-2xl bg-black/10 px-4 py-4 font-black active:scale-[0.98]"
            >
              Zrušiť
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-[28px] bg-white/70"
            />
          ))}
        </div>
      )}

      {!loading && dojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
          Nemáš priradené žiadne dojo.
        </div>
      )}

      {!loading && dojos.length > 0 && filteredDojos.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/10">
          Nenašlo sa žiadne dojo pre tento filter.
        </div>
      )}

      {!loading && filteredDojos.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDojos.map((dojo) => (
            <Link
              key={dojo.id}
              href={`/dojos/${dojo.id}`}
              className="group overflow-hidden rounded-[30px] bg-white shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
            >
              <div className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
                    <Building2 size={26} />
                  </div>

                  <span className="rounded-full bg-[#f7f2e8] px-3 py-1 text-xs font-black text-black/55">
                    Dojo
                  </span>
                </div>

                <h2 className="text-2xl font-black text-[#111]">
                  {dojo.name}
                </h2>

                <div className="mt-3 flex items-start gap-2 text-sm text-black/55">
                  <MapPin size={17} className="mt-0.5 shrink-0" />
                  <p>{dojo.address || "Bez adresy"}</p>
                </div>

                <div className="mt-5 rounded-2xl bg-[#f7f2e8] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarCheck size={17} className="text-[#d71920]" />
                    <p className="text-sm font-black text-black/60">
                      Tréningy
                    </p>
                  </div>

                  <p className="whitespace-pre-line text-sm font-semibold text-black/70">
                    {dojo.training_schedule ||
                      "Časy tréningov ešte nie sú vyplnené."}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <span className="inline-flex items-center justify-center rounded-2xl bg-[#111] px-4 py-3 text-sm font-black text-white">
                    Otvoriť
                  </span>

                  <span className="inline-flex items-center justify-center rounded-2xl bg-[#d71920] px-4 py-3 text-sm font-black text-white">
                    Prezenčka
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#d71920] text-white shadow-[0_12px_28px_rgba(215,25,32,0.4)] active:scale-[0.95] md:hidden"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
}
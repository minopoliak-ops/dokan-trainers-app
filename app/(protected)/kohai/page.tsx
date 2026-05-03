"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  Check,
  ChevronDown,
  KeyRound,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PermissionKey =
  | "can_attendance"
  | "can_add_students"
  | "can_create_trainings"
  | "can_manage_topics";

type KohaiForm = {
  full_name: string;
  email: string;
  dojo_ids: string[];
  can_attendance: boolean;
  can_add_students: boolean;
  can_create_trainings: boolean;
  can_manage_topics: boolean;
};

const permissionCards: { key: PermissionKey; title: string; subtitle: string }[] = [
  {
    key: "can_attendance",
    title: "Prezenčka",
    subtitle: "Môže zapisovať dochádzku na tréningu.",
  },
  {
    key: "can_add_students",
    title: "Nový člen",
    subtitle: "Môže pridať alebo upraviť cvičiaceho.",
  },
  {
    key: "can_create_trainings",
    title: "Tréningy",
    subtitle: "Môže vytvoriť tréning a témy tréningu.",
  },
  {
    key: "can_manage_topics",
    title: "Techniky / témy",
    subtitle: "Môže dopĺňať technické stupne a témy.",
  },
];

function emptyForm(): KohaiForm {
  return {
    full_name: "",
    email: "",
    dojo_ids: [],
    can_attendance: true,
    can_add_students: false,
    can_create_trainings: false,
    can_manage_topics: false,
  };
}

export default function KohaiPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [kohai, setKohai] = useState<any[]>([]);
  const [dojos, setDojos] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [form, setForm] = useState<KohaiForm>(emptyForm());
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingAccessId, setCreatingAccessId] = useState("");

  const isAdmin = !!permissions?.can_manage_trainers;

  async function loadData() {
    if (permissionsLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const [trainersRes, dojosRes, linksRes] = await Promise.all([
      supabase
        .from("trainers")
        .select("*")
        .eq("role", "kohai")
        .order("full_name"),
      supabase.from("dojos").select("*").order("name"),
      supabase.from("trainer_dojos").select("*"),
    ]);

    if (trainersRes.error) alert(trainersRes.error.message);
    if (dojosRes.error) alert(dojosRes.error.message);
    if (linksRes.error) alert(linksRes.error.message);

    setKohai(trainersRes.data || []);
    setDojos(dojosRes.data || []);
    setLinks(linksRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [permissionsLoading, isAdmin]);

  const kohaiWithDojos = useMemo(() => {
    return kohai.map((person) => {
      const dojoIds = links
        .filter((link) => link.trainer_id === person.id)
        .map((link) => link.dojo_id);
      const names = dojos
        .filter((dojo) => dojoIds.includes(dojo.id))
        .map((dojo) => dojo.name);

      return { ...person, dojo_ids: dojoIds, dojo_names: names };
    });
  }, [kohai, links, dojos]);

  function updateForm(field: keyof KohaiForm, value: any) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDojo(id: string) {
    setForm((current) => {
      const exists = current.dojo_ids.includes(id);

      return {
        ...current,
        dojo_ids: exists
          ? current.dojo_ids.filter((dojoId) => dojoId !== id)
          : [...current.dojo_ids, id],
      };
    });
  }

  function startCreate() {
    setEditingId("");
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(person: any) {
    setEditingId(person.id);
    setForm({
      full_name: person.full_name || "",
      email: person.email || "",
      dojo_ids: person.dojo_ids || [],
      can_attendance: !!person.can_attendance,
      can_add_students: !!person.can_add_students,
      can_create_trainings: !!person.can_create_trainings,
      can_manage_topics: !!person.can_manage_topics,
    });
    setShowForm(true);
  }

  async function saveKohai(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return alert("Nemáš oprávnenie spravovať kohai.");
    if (!form.full_name.trim()) return alert("Vyplň meno.");
    if (!form.email.trim()) return alert("Vyplň email.");
    if (form.dojo_ids.length === 0) return alert("Vyber aspoň jedno dojo.");

    setSaving(true);
    const supabase = createClient();

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      role: "kohai",
      can_attendance: form.can_attendance,
      can_add_students: form.can_add_students,
      can_create_trainings: form.can_create_trainings,
      can_manage_topics: form.can_manage_topics,
      can_delete_students: false,
      can_manage_trainers: false,
    };

    let trainerId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("trainers")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setSaving(false);
        return alert(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("trainers")
        .upsert(payload, { onConflict: "email" })
        .select("id")
        .single();

      if (error) {
        setSaving(false);
        return alert(error.message);
      }

      trainerId = data.id;
    }

    const { error: deleteLinksError } = await supabase
      .from("trainer_dojos")
      .delete()
      .eq("trainer_id", trainerId);

    if (deleteLinksError) {
      setSaving(false);
      return alert(deleteLinksError.message);
    }

    const rows = form.dojo_ids.map((dojo_id) => ({ trainer_id: trainerId, dojo_id }));
    const { error: linkError } = await supabase.from("trainer_dojos").insert(rows);

    setSaving(false);
    if (linkError) return alert(linkError.message);

    setShowForm(false);
    setEditingId("");
    setForm(emptyForm());
    loadData();
  }

  async function createLoginForKohai(person: any) {
    if (!isAdmin) return alert("Nemáš oprávnenie vytvárať prístup.");
    if (!person.email) return alert("Kohai musí mať vyplnený email.");

    const dojoIds = person.dojo_ids || [];
    if (dojoIds.length === 0) return alert("Kohai musí mať priradené aspoň jedno dojo.");

    setCreatingAccessId(person.id);

    try {
      const res = await fetch("/api/admin/create-trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainer_id: person.id,
          full_name: person.full_name,
          email: person.email,
          role: "kohai",
          dojo_ids: dojoIds,
          dojo_id: dojoIds[0],
          can_attendance: !!person.can_attendance,
          can_add_students: !!person.can_add_students,
          can_create_trainings: !!person.can_create_trainings,
          can_manage_topics: !!person.can_manage_topics,
          can_delete_students: false,
          can_manage_trainers: false,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || data.message || "Nepodarilo sa vytvoriť prístup.");
        return;
      }

      alert(
        `Prístup vytvorený ✅\n\nEmail: ${data.email || person.email}\nHeslo: ${
          data.password || "pozri email / Supabase Auth"
        }`
      );

      loadData();
    } catch (error: any) {
      alert(error?.message || "Nepodarilo sa vytvoriť prístup.");
    } finally {
      setCreatingAccessId("");
    }
  }

  async function removeKohai(id: string) {
    if (!isAdmin) return alert("Nemáš oprávnenie spravovať kohai.");
    if (!confirm("Odobrať kohai prístup? Záznam trénera sa vymaže.")) return;

    const supabase = createClient();

    const { error: linkError } = await supabase
      .from("trainer_dojos")
      .delete()
      .eq("trainer_id", id);

    if (linkError) return alert(linkError.message);

    const { error } = await supabase.from("trainers").delete().eq("id", id);
    if (error) return alert(error.message);

    loadData();
  }

  if (permissionsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 font-bold shadow-sm">
          Načítavam kohai menu...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 text-center font-bold shadow-sm">
          Táto stránka je dostupná iba administrátorovi.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f2e8] px-4 py-6 pb-40 sm:px-5 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <ShieldCheck size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Admin nastavenia
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Kohai prístupy</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Vytvor pomocníkov pre tréning. Kohai môže mať prístup iba do
            vybraných dojo a iba k povoleniam, ktoré mu zapneš.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Kohai</p>
              <p className="text-3xl font-black">{kohai.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Dojo</p>
              <p className="text-3xl font-black">{dojos.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Najčastejšie</p>
              <p className="text-3xl font-black">Prezenčka</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={startCreate}
        className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
      >
        <UserPlus size={20} />
        Pridať kohai
      </button>

      {showForm && (
        <form
          onSubmit={saveKohai}
          className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                {editingId ? "Úprava prístupu" : "Nový prístup"}
              </p>
              <h2 className="text-2xl font-black">
                {editingId ? "Upraviť kohai" : "Pridať kohai"}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-2xl bg-black/10 px-4 py-3 font-black"
            >
              Zavrieť
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              placeholder="Meno a priezvisko"
              className="h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white"
            />

            <input
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              type="email"
              placeholder="Email kohai"
              className="h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-base font-bold outline-none focus:border-[#d71920] focus:bg-white"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-black text-black/55">Priradené dojo</p>
            <div className="grid gap-2 md:grid-cols-2">
              {dojos.map((dojo) => {
                const active = form.dojo_ids.includes(dojo.id);

                return (
                  <button
                    key={dojo.id}
                    type="button"
                    onClick={() => toggleDojo(dojo.id)}
                    className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-left font-black ring-1 active:scale-[0.98] ${
                      active
                        ? "bg-[#111] text-white ring-[#111]"
                        : "bg-[#f7f2e8] text-black ring-black/5"
                    }`}
                  >
                    <span className="min-w-0 break-words">{dojo.name}</span>
                    {active ? <Check size={20} /> : <X size={20} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-black text-black/55">Povolenia</p>
            <div className="grid gap-3 md:grid-cols-2">
              {permissionCards.map((item) => {
                const active = !!form[item.key];

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateForm(item.key, !active)}
                    className={`rounded-3xl p-4 text-left ring-1 active:scale-[0.98] ${
                      active ? "bg-green-50 ring-green-200" : "bg-[#f7f2e8] ring-black/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{item.title}</h3>
                        <p className="mt-1 text-sm font-semibold text-black/55">
                          {item.subtitle}
                        </p>
                      </div>

                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          active ? "bg-green-600 text-white" : "bg-black/10"
                        }`}
                      >
                        {active ? <Check size={20} /> : <X size={20} />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={saving}
            className="inline-flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 font-black text-white active:scale-[0.98] disabled:opacity-60"
          >
            <ShieldCheck size={20} />
            {saving ? "Ukladám..." : "Uložiť kohai prístup"}
          </button>
        </form>
      )}

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
            <Users />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Zoznam
            </p>
            <h2 className="text-2xl font-black">Kohai pomocníci</h2>
          </div>
        </div>

        {kohaiWithDojos.length === 0 ? (
          <p className="rounded-2xl bg-[#f7f2e8] p-5 text-center font-bold text-black/55">
            Zatiaľ nie je pridaný žiadny kohai.
          </p>
        ) : (
          <div className="grid gap-3">
            {kohaiWithDojos.map((person) => {
              const activePermissions = permissionCards
                .filter((item) => !!person[item.key])
                .map((item) => item.title);

              return (
                <div
                  key={person.id}
                  className="overflow-hidden rounded-[28px] bg-[#f7f2e8] ring-1 ring-black/5"
                >
                  <button
                    type="button"
                    onClick={() => startEdit(person)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserCog className="text-[#d71920]" size={20} />
                        <h3 className="break-words text-xl font-black">
                          {person.full_name || person.email}
                        </h3>
                      </div>

                      <p className="mt-1 break-all text-sm font-semibold text-black/55">
                        {person.email}
                      </p>

                      <p className="mt-2 text-sm text-black/55">
                        Dojo: <b>{person.dojo_names.length > 0 ? person.dojo_names.join(", ") : "bez dojo"}</b>
                      </p>

                      <p className="mt-1 text-sm text-black/55">
                        Povolenia: <b>{activePermissions.length > 0 ? activePermissions.join(", ") : "žiadne"}</b>
                      </p>
                    </div>

                    <ChevronDown className="-rotate-90 shrink-0" />
                  </button>

                  <div className="grid gap-2 border-t border-black/5 p-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => createLoginForKohai(person)}
                      disabled={creatingAccessId === person.id}
                      className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#111] px-4 font-black text-white active:scale-[0.98] disabled:opacity-60"
                    >
                      <KeyRound size={18} />
                      {creatingAccessId === person.id
                        ? "Vytváram prístup..."
                        : "Automaticky vytvoriť prístup"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeKohai(person.id)}
                      className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 font-black text-red-700 active:scale-[0.98]"
                    >
                      <Trash2 size={18} />
                      Odobrať prístup
                    </button>
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

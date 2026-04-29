"use client";

import { createClient } from "@/lib/supabase/browser";
import { Copy, MapPin, MessageCircle, Navigation, Phone, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function DojoDetailPage({ params }: { params: { id: string } }) {
  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [editDojo, setEditDojo] = useState(false);
  const pressTimer = useRef<any>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    const supabase = createClient();

    const { data: dojoData } = await supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .single();

    const { data: studentsData } = await supabase
      .from("students")
      .select("*")
      .eq("dojo_id", params.id)
      .eq("active", true)
      .order("last_name");

    setDojo(dojoData);
    setStudents(studentsData || []);
  }

  function contactPhone(student: any) {
    return student.is_adult ? student.phone : student.parent_phone;
  }

  function contactLabel(student: any) {
    return student.is_adult ? "Dospelý" : "Rodič";
  }

  function cleanPhone(phone: string) {
    return String(phone || "").replace(/\s/g, "");
  }

  function whatsappLink(phone: string) {
    const clean = cleanPhone(phone).replace("+", "");
    return `https://wa.me/${clean}`;
  }

  async function copyPhone(phone: string) {
    await navigator.clipboard.writeText(phone);
    alert("Číslo skopírované.");
  }

  function startLongPress(phone: string) {
    pressTimer.current = setTimeout(() => copyPhone(phone), 650);
  }

  function stopLongPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  async function saveDojo() {
    const supabase = createClient();

    const { error } = await supabase
      .from("dojos")
      .update({
        name: dojo.name || null,
        address: dojo.address || null,
        training_schedule: dojo.training_schedule || null,
        map_url: dojo.map_url || null,
      })
      .eq("id", params.id);

    if (error) return alert(error.message);

    alert("Dojo uložené.");
    setEditDojo(false);
    loadData();
  }

  function updateDojo(field: string, value: string) {
    setDojo((current: any) => ({
      ...current,
      [field]: value,
    }));
  }

  if (!dojo) return <p>Načítavam...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <p className="mb-2 text-sm text-white/60">Detail dojo</p>
        <h1 className="text-3xl font-bold">{dojo.name}</h1>
        <p className="mt-2 text-white/70">{dojo.address}</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Tréningy + mapa</h2>

          <button
            onClick={() => setEditDojo(!editDojo)}
            className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"
          >
            {editDojo ? "Zavrieť" : "Upraviť"}
          </button>
        </div>

        {editDojo ? (
          <div className="grid gap-3">
            <input
              value={dojo.name || ""}
              onChange={(e) => updateDojo("name", e.target.value)}
              placeholder="Názov dojo"
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={dojo.address || ""}
              onChange={(e) => updateDojo("address", e.target.value)}
              placeholder="Adresa"
              className="rounded-xl border px-4 py-3"
            />

            <textarea
              value={dojo.training_schedule || ""}
              onChange={(e) => updateDojo("training_schedule", e.target.value)}
              placeholder="Časy tréningov"
              rows={4}
              className="rounded-xl border px-4 py-3"
            />

            <input
              value={dojo.map_url || ""}
              onChange={(e) => updateDojo("map_url", e.target.value)}
              placeholder="Google Maps link"
              className="rounded-xl border px-4 py-3"
            />

            <button
              onClick={saveDojo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d71920] px-4 py-3 font-bold text-white"
            >
              <Save size={18} />
              Uložiť dojo
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-[#f7f2e8] p-4">
              <p className="mb-1 text-sm font-bold text-black/50">Časy tréningov</p>
              <p className="whitespace-pre-line font-semibold">
                {dojo.training_schedule || "Časy tréningov ešte nie sú vyplnené."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {dojo.map_url && (
                <>
                  <a
                    href={dojo.map_url}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-4 py-3 font-bold text-white"
                  >
                    <MapPin size={18} />
                    Otvoriť mapu
                  </a>

                  <a
                    href={dojo.map_url}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"
                  >
                    <Navigation size={18} />
                    Navigovať
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/students/new?dojo=${params.id}`}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
        >
          <h2 className="text-xl font-bold">+ Pridať žiaka</h2>
          <p className="mt-2 text-black/60">Nový žiak do tohto dojo.</p>
        </Link>

        <Link
          href={`/dojos/${params.id}/attendance`}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10"
        >
          <h2 className="text-xl font-bold">Prezenčka</h2>
          <p className="mt-2 text-black/60">
            Mesiace, dátumy tréningov a dochádzka.
          </p>
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <h2 className="text-xl font-bold">Tréningy</h2>
          <p className="mt-2 text-black/60">Časy, mapa a navigácia.</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Žiaci</h2>

        {students.length === 0 ? (
          <p>Zatiaľ tu nie sú žiadni žiaci.</p>
        ) : (
          <div className="grid gap-3">
            {students.map((student) => {
              const phone = contactPhone(student);

              return (
                <div
                  key={student.id}
                  className={`rounded-2xl border p-4 ${
                    student.is_adult
                      ? "border-green-200 bg-green-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <Link href={`/students/${student.id}`} className="block">
                    <p className="text-lg font-bold">
                      {student.first_name} {student.last_name}
                    </p>

                    <p className="text-sm text-black/60">
                      {student.technical_grade || "Bez technického stupňa"}
                    </p>

                    <p className="mt-1 text-xs font-bold text-black/50">
                      {student.is_adult ? "🟢 Dospelý cvičiaci" : "🔵 Dieťa / kontakt rodič"}
                    </p>
                  </Link>

                  {phone && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`tel:${phone}`}
                        onTouchStart={() => startLongPress(phone)}
                        onTouchEnd={stopLongPress}
                        onMouseDown={() => startLongPress(phone)}
                        onMouseUp={stopLongPress}
                        onMouseLeave={stopLongPress}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-3 py-2 text-sm font-bold text-white"
                      >
                        <Phone size={16} />
                        {contactLabel(student)}: {phone}
                      </a>

                      <a
                        href={whatsappLink(phone)}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-bold text-white"
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </a>

                      <button
                        onClick={() => copyPhone(phone)}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-sm font-bold text-white"
                      >
                        <Copy size={16} />
                        Kopírovať
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  CalendarCheck,
  Copy,
  Edit3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Save,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function DojoDetailPage({ params }: { params: { id: string } }) {
  const [dojo, setDojo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [editDojo, setEditDojo] = useState(false);
  const [search, setSearch] = useState("");
  const [studentType, setStudentType] = useState<"all" | "adults" | "kids">(
    "all"
  );

  const pressTimer = useRef<any>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    const supabase = createClient();

    const { data: dojoData, error: dojoError } = await supabase
      .from("dojos")
      .select("*")
      .eq("id", params.id)
      .single();

    if (dojoError) {
      alert(dojoError.message);
      return;
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("dojo_id", params.id)
      .eq("active", true)
      .order("last_name");

    if (studentsError) {
      alert(studentsError.message);
      return;
    }

    setDojo(dojoData);
    setStudents(studentsData || []);
  }

  const stats = useMemo(() => {
    return {
      total: students.length,
      adults: students.filter((s) => s.is_adult).length,
      kids: students.filter((s) => !s.is_adult).length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return students.filter((student) => {
      if (studentType === "adults" && !student.is_adult) return false;
      if (studentType === "kids" && student.is_adult) return false;

      if (!q) return true;

      return [
        student.first_name,
        student.last_name,
        student.technical_grade,
        student.phone,
        student.parent_phone,
        student.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, search, studentType]);

  function contactPhone(student: any) {
    return student.is_adult
      ? student.phone || student.parent_phone
      : student.parent_phone || student.phone;
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

  if (!dojo) {
    return (
      <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          Načítavam dojo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-[#f7f2e8] px-5 py-6 pb-40">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <MapPin size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Detail dojo
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {dojo.name}
          </h1>

          <p className="mt-2 max-w-2xl text-white/65">
            {dojo.address || "Bez adresy"}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Žiaci spolu</p>
              <p className="text-3xl font-black">{stats.total}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Deti</p>
              <p className="text-3xl font-black">{stats.kids}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Dospelí</p>
              <p className="text-3xl font-black">{stats.adults}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/students/new?dojo=${params.id}`}
          className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
            <Plus />
          </div>

          <h2 className="text-xl font-black">Pridať žiaka</h2>
          <p className="mt-1 text-sm text-black/55">
            Nový cvičiaci do tohto dojo.
          </p>
        </Link>

        <Link
          href={`/dojos/${params.id}/attendance`}
          className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white shadow-md">
            <CalendarCheck />
          </div>

          <h2 className="text-xl font-black">Prezenčka</h2>
          <p className="mt-1 text-sm text-black/55">
            Dochádzka, tréningy a témy.
          </p>
        </Link>

        {dojo.map_url ? (
          <a
            href={dojo.map_url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
              <Navigation />
            </div>

            <h2 className="text-xl font-black">Mapa / navigácia</h2>
            <p className="mt-1 text-sm text-black/55">
              Otvoriť cestu do dojo.
            </p>
          </a>
        ) : (
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10 text-black">
              <Navigation />
            </div>

            <h2 className="text-xl font-black">Mapa</h2>
            <p className="mt-1 text-sm text-black/55">
              Google Maps link ešte nie je vyplnený.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Dojo info
            </p>
            <h2 className="text-2xl font-black">Tréningy + mapa</h2>
          </div>

          <button
            type="button"
            onClick={() => setEditDojo(!editDojo)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black active:scale-[0.98] ${
              editDojo ? "bg-black/10 text-black" : "bg-[#111] text-white"
            }`}
          >
            {editDojo ? <X size={18} /> : <Edit3 size={18} />}
            {editDojo ? "Zavrieť" : "Upraviť"}
          </button>
        </div>

        {editDojo ? (
          <div className="grid gap-3">
            <input
              value={dojo.name || ""}
              onChange={(e) => updateDojo("name", e.target.value)}
              placeholder="Názov dojo"
              className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
            />

            <input
              value={dojo.address || ""}
              onChange={(e) => updateDojo("address", e.target.value)}
              placeholder="Adresa"
              className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
            />

            <textarea
              value={dojo.training_schedule || ""}
              onChange={(e) => updateDojo("training_schedule", e.target.value)}
              placeholder="Časy tréningov"
              rows={4}
              className="rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-3 font-bold outline-none"
            />

            <input
              value={dojo.map_url || ""}
              onChange={(e) => updateDojo("map_url", e.target.value)}
              placeholder="Google Maps link"
              className="h-[52px] rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 font-bold outline-none"
            />

            <button
              type="button"
              onClick={saveDojo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 py-4 font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98]"
            >
              <Save size={18} />
              Uložiť dojo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[#f7f2e8] p-5">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-black/35">
                Časy tréningov
              </p>

              <p className="whitespace-pre-line text-lg font-black leading-relaxed">
                {dojo.training_schedule ||
                  "Časy tréningov ešte nie sú vyplnené."}
              </p>
            </div>

            <div className="rounded-3xl bg-[#f7f2e8] p-5">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-black/35">
                Adresa
              </p>

              <p className="font-bold text-black/75">
                {dojo.address || "Adresa ešte nie je vyplnená."}
              </p>

              {dojo.map_url && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={dojo.map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#d71920] px-4 py-3 font-bold text-white active:scale-[0.98]"
                  >
                    <MapPin size={18} />
                    Otvoriť mapu
                  </a>

                  <a
                    href={dojo.map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#111] px-4 py-3 font-bold text-white active:scale-[0.98]"
                  >
                    <Navigation size={18} />
                    Navigovať
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
              Zoznam cvičiacich
            </p>
            <h2 className="text-2xl font-black">Žiaci</h2>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať žiaka..."
              className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] pl-11 pr-4 font-bold outline-none md:w-[260px]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStudentType("all")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentType === "all"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Všetci
            </button>

            <button
              type="button"
              onClick={() => setStudentType("kids")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentType === "kids"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Deti
            </button>

            <button
              type="button"
              onClick={() => setStudentType("adults")}
              className={`rounded-2xl px-4 py-3 font-black ${
                studentType === "adults"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Dospelí
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-3xl bg-[#f7f2e8] p-6 text-center text-black/55">
            Nenašli sa žiadni žiaci.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStudents.map((student) => {
              const phone = contactPhone(student);

              return (
                <div
                  key={student.id}
                  className={`rounded-[28px] p-5 shadow-sm ring-1 ${
                    student.is_adult
                      ? "bg-green-50 ring-green-100"
                      : "bg-blue-50 ring-blue-100"
                  }`}
                >
                  <Link href={`/students/${student.id}`} className="block">
                    <div className="mb-4 flex items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          student.is_adult
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {student.is_adult ? <User /> : <Users />}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xl font-black leading-tight">
                          {student.first_name} {student.last_name}
                        </h3>

                        <p className="mt-1 text-sm font-bold text-black/55">
                          {student.technical_grade || "Bez technického stupňa"}
                        </p>

                        <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-black/55">
                          {student.is_adult
                            ? "Dospelý cvičiaci"
                            : "Dieťa / kontakt rodič"}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {phone ? (
                    <div className="grid gap-2">
                      <a
                        href={`tel:${phone}`}
                        onTouchStart={() => startLongPress(phone)}
                        onTouchEnd={stopLongPress}
                        onMouseDown={() => startLongPress(phone)}
                        onMouseUp={stopLongPress}
                        onMouseLeave={stopLongPress}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-3 py-3 text-sm font-black text-white active:scale-[0.98]"
                      >
                        <Phone size={16} />
                        {contactLabel(student)}: {phone}
                      </a>

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={whatsappLink(phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-3 text-sm font-black text-white active:scale-[0.98]"
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </a>

                        <button
                          type="button"
                          onClick={() => copyPhone(phone)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111] px-3 py-3 text-sm font-black text-white active:scale-[0.98]"
                        >
                          <Copy size={16} />
                          Kopírovať
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white p-4 text-sm font-bold text-black/45">
                      Telefón nie je vyplnený.
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
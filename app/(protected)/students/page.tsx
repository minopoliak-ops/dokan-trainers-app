"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  Download,
  GraduationCap,
  Search,
  Upload,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StudentFilter = "all" | "kids" | "adults";

export default function StudentsPage() {
  const { permissions, dojoIds } = usePermissions();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");

  const isAdmin = !!permissions?.can_manage_trainers;

  useEffect(() => {
    async function loadStudents() {
      if (!permissions) return;

      setLoading(true);

      const supabase = createClient();

      let query = supabase
        .from("students")
        .select("*, dojos(name)")
        .eq("active", true)
        .order("last_name");

      if (!isAdmin) {
        if (dojoIds.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        query = query.in("dojo_id", dojoIds);
      }

      const { data, error } = await query;

      if (error) console.error(error.message);

      setStudents(data || []);
      setLoading(false);
    }

    loadStudents();
  }, [permissions, dojoIds, isAdmin]);

  const stats = useMemo(() => {
    return {
      total: students.length,
      kids: students.filter((s) => !s.is_adult).length,
      adults: students.filter((s) => s.is_adult).length,
      withGrade: students.filter((s) => !!s.technical_grade).length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return students.filter((student) => {
      if (filter === "kids" && student.is_adult) return false;
      if (filter === "adults" && !student.is_adult) return false;

      if (!q) return true;

      return [
        student.first_name,
        student.last_name,
        student.dojos?.name,
        student.technical_grade,
        student.email,
        student.phone,
        student.parent_phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, search, filter]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Users size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Administrácia
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">Žiaci</h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Pridávanie, vyhľadávanie, import, export a technické stupne.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Spolu</p>
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

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">So stupňom</p>
              <p className="text-3xl font-black">{stats.withGrade}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href="/students/new"
          className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
            <UserPlus />
          </div>

          <h2 className="text-xl font-black">Pridať žiaka</h2>
          <p className="mt-1 text-sm text-black/55">
            Nový cvičiaci do dojo.
          </p>
        </Link>

        {isAdmin && (
          <>
            <Link
              href="/students/import"
              className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white shadow-md">
                <Upload />
              </div>

              <h2 className="text-xl font-black">Import CSV</h2>
              <p className="mt-1 text-sm text-black/55">
                Hromadné nahratie žiakov.
              </p>
            </Link>

            <Link
              href="/students/export"
              className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920] shadow-md">
                <Download />
              </div>

              <h2 className="text-xl font-black">Export CSV</h2>
              <p className="mt-1 text-sm text-black/55">
                Export zoznamu žiakov.
              </p>
            </Link>
          </>
        )}
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať meno, dojo, stupeň, kontakt..."
              className="h-[54px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] pl-12 pr-4 font-bold outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-2xl px-4 py-3 font-black active:scale-[0.98] ${
                filter === "all"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Všetci
            </button>

            <button
              type="button"
              onClick={() => setFilter("kids")}
              className={`rounded-2xl px-4 py-3 font-black active:scale-[0.98] ${
                filter === "kids"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Deti
            </button>

            <button
              type="button"
              onClick={() => setFilter("adults")}
              className={`rounded-2xl px-4 py-3 font-black active:scale-[0.98] ${
                filter === "adults"
                  ? "bg-[#111] text-white"
                  : "bg-black/10 text-black"
              }`}
            >
              Dospelí
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-[28px] bg-white/70"
            />
          ))}
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center text-black/60 shadow-sm ring-1 ring-black/10">
          Žiadni žiaci pre tvoje dojo.
        </div>
      )}

      {!loading && students.length > 0 && filteredStudents.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center text-black/60 shadow-sm ring-1 ring-black/10">
          Nenašli sa žiadni žiaci pre tento filter.
        </div>
      )}

      {!loading && filteredStudents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => (
            <Link
              href={`/students/${student.id}`}
              key={student.id}
              className={`rounded-[28px] p-5 shadow-sm ring-1 active:scale-[0.98] ${
                student.is_adult
                  ? "bg-green-50 ring-green-100"
                  : "bg-blue-50 ring-blue-100"
              }`}
            >
              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${
                    student.is_adult ? "bg-green-600" : "bg-blue-600"
                  }`}
                >
                  <UserRound />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight text-[#111]">
                    {student.first_name} {student.last_name}
                  </h2>

                  <p className="mt-1 text-sm font-bold text-black/55">
                    {student.dojos?.name || "Bez dojo"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={17} className="text-black/40" />
                    <p className="text-sm font-black text-black/65">
                      {student.technical_grade || "Bez technického stupňa"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      student.is_adult
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {student.is_adult ? "Dospelý" : "Dieťa"}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-black/55">
                    Detail žiaka
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
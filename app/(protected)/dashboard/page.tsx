"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  Crown,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

function formatDate(date?: string) {
  if (!date) return "Bez dátumu";
  return new Date(date).toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const {
    permissions,
    dojoIds,
    loading: permissionsLoading,
    mounted,
  } = usePermissions();

  const [dojos, setDojos] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [kohaiHelpers, setKohaiHelpers] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isSensei = !!permissions?.can_manage_trainers;
  const role = permissions?.role || (isSensei ? "sensei" : "senpai");

  async function loadDashboard() {
    if (!mounted || permissionsLoading || !permissions) return;

    setLoading(true);

    const supabase = createClient();

    if (isSensei) {
      const [dojosRes, trainersRes, kohaiRes, trainingsRes] =
        await Promise.all([
          supabase.from("dojos").select("*").order("name"),
          supabase.from("trainers").select("*").order("full_name"),
          supabase
            .from("dojo_kohai_helpers")
            .select("*, dojos(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("trainings")
            .select("*, dojos(name), training_topics(name)")
            .order("training_date", { ascending: false })
            .limit(20),
        ]);

      if (dojosRes.error) console.error(dojosRes.error.message);
      if (trainersRes.error) console.error(trainersRes.error.message);
      if (kohaiRes.error) console.error(kohaiRes.error.message);
      if (trainingsRes.error) console.error(trainingsRes.error.message);

      setDojos(dojosRes.data || []);
      setTrainers(trainersRes.data || []);
      setKohaiHelpers(kohaiRes.data || []);
      setTrainings(trainingsRes.data || []);
      setLoading(false);
      return;
    }

    if (!dojoIds || dojoIds.length === 0) {
      setDojos([]);
      setTrainers([]);
      setKohaiHelpers([]);
      setTrainings([]);
      setLoading(false);
      return;
    }

    const [dojosRes, kohaiRes, trainingsRes] = await Promise.all([
      supabase.from("dojos").select("*").in("id", dojoIds).order("name"),
      supabase
        .from("dojo_kohai_helpers")
        .select("*, dojos(name)")
        .in("dojo_id", dojoIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("trainings")
        .select("*, dojos(name), training_topics(name)")
        .in("dojo_id", dojoIds)
        .order("training_date", { ascending: false })
        .limit(10),
    ]);

    if (dojosRes.error) console.error(dojosRes.error.message);
    if (kohaiRes.error) console.error(kohaiRes.error.message);
    if (trainingsRes.error) console.error(trainingsRes.error.message);

    setDojos(dojosRes.data || []);
    setKohaiHelpers(kohaiRes.data || []);
    setTrainings(trainingsRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, [mounted, permissionsLoading, permissions?.id, isSensei]);

  const stats = useMemo(() => {
    return {
      dojos: dojos.length,
      trainers: trainers.length,
      sensei: trainers.filter((t) => t.role === "sensei").length,
      senpai: trainers.filter((t) => (t.role || "senpai") === "senpai").length,
      kohai: kohaiHelpers.length,
      trainings: trainings.length,
    };
  }, [dojos, trainers, kohaiHelpers, trainings]);

  const heroTitle = isSensei
    ? "Sensei dashboard"
    : role === "kohai"
    ? "Kōhai dashboard"
    : "Senpai dashboard";

  const heroSubtitle = isSensei
    ? "Celý prehľad dojo, trénerov, kōhai pomocníkov a posledných tréningov."
    : role === "kohai"
    ? "Tvoje dojo, tréningy a pomocné informácie na jednom mieste."
    : "Tvoje dojo, tréningy a rýchle akcie pre trénera.";

  if (!mounted || permissionsLoading) return null;

  return (
    <div className="min-h-screen space-y-6 bg-[#f7f2e8] px-5 py-6 pb-40">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            {isSensei ? (
              <Crown size={28} />
            ) : role === "kohai" ? (
              <GraduationCap size={28} />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            DOKAN Bratislava
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {heroTitle}
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">{heroSubtitle}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Dojo</p>
              <p className="text-3xl font-black">{stats.dojos}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">
                {isSensei ? "Tréneri" : "Kōhai pomocníci"}
              </p>
              <p className="text-3xl font-black">
                {isSensei ? stats.trainers : stats.kohai}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Posledné tréningy</p>
              <p className="text-3xl font-black">{stats.trainings}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      ) : (
        <>
          {isSensei && (
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/trainers"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-black">
                  <Crown />
                </div>
                <h2 className="text-xl font-black">Sensei / tím</h2>
                <p className="mt-1 text-sm text-black/55">
                  Sensei: {stats.sensei} · Senpai: {stats.senpai} · Kōhai:{" "}
                  {stats.kohai}
                </p>
              </Link>

              <Link
                href="/trainings"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white">
                  <CalendarCheck />
                </div>
                <h2 className="text-xl font-black">Tréningy</h2>
                <p className="mt-1 text-sm text-black/55">
                  Prehľad tréningov podľa dojo.
                </p>
              </Link>

              <Link
                href="/stats"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white">
                  <BarChart3 />
                </div>
                <h2 className="text-xl font-black">Štatistiky</h2>
                <p className="mt-1 text-sm text-black/55">
                  Dochádzka, témy, semináre a prehľady.
                </p>
              </Link>
            </div>
          )}

          {!isSensei && (
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/trainings"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white">
                  <CalendarCheck />
                </div>
                <h2 className="text-xl font-black">Moje tréningy</h2>
                <p className="mt-1 text-sm text-black/55">
                  Posledné tréningy tvojich dojo.
                </p>
              </Link>

              <Link
                href="/topics"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white">
                  <BookOpen />
                </div>
                <h2 className="text-xl font-black">Témy</h2>
                <p className="mt-1 text-sm text-black/55">
                  Materiály a cvičenia na tréning.
                </p>
              </Link>

              <Link
                href="/chat"
                className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f2e8] text-[#d71920]">
                  <MessageCircle />
                </div>
                <h2 className="text-xl font-black">Chat</h2>
                <p className="mt-1 text-sm text-black/55">
                  Rýchla komunikácia tímu.
                </p>
              </Link>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Dojo
                </p>
                <h2 className="text-2xl font-black">
                  {isSensei ? "Všetky dojo" : "Moje dojo"}
                </h2>
              </div>
            </div>

            {dojos.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                Nemáš priradené žiadne dojo.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {dojos.map((dojo) => {
                  const dojoKohai = kohaiHelpers.filter(
                    (k) => k.dojo_id === dojo.id
                  );
                  const dojoTrainings = trainings.filter(
                    (t) => t.dojo_id === dojo.id
                  );
                  const lastTraining = dojoTrainings[0];

                  return (
                    <Link
                      key={dojo.id}
                      href={`/dojos/${dojo.id}`}
                      className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/10 active:scale-[0.98]"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-md">
                          <Building2 size={26} />
                        </div>

                        <span className="rounded-full bg-[#f7f2e8] px-3 py-1 text-xs font-black text-black/55">
                          {dojoKohai.length} kōhai
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-[#111]">
                        {dojo.name}
                      </h3>

                      <p className="mt-1 text-sm text-black/55">
                        {dojo.address || "Bez adresy"}
                      </p>

                      <div className="mt-4 rounded-2xl bg-[#f7f2e8] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                          Posledný tréning
                        </p>
                        <p className="mt-1 font-black">
                          {lastTraining
                            ? formatDate(lastTraining.training_date)
                            : "Zatiaľ žiadny"}
                        </p>
                        <p className="text-sm text-black/55">
                          {lastTraining?.training_topics?.name || "Bez témy"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                  Tréningy
                </p>
                <h2 className="text-2xl font-black">Posledné tréningy</h2>
              </div>

              <Link
                href="/trainings"
                className="rounded-2xl bg-[#111] px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
              >
                Otvoriť všetky
              </Link>
            </div>

            {trainings.length === 0 ? (
              <div className="rounded-2xl bg-[#f7f2e8] p-5 text-center text-black/55">
                Zatiaľ tu nie sú tréningy.
              </div>
            ) : (
              <div className="grid gap-3">
                {trainings.slice(0, 6).map((training) => (
                  <Link
                    key={training.id}
                    href={`/dojos/${training.dojo_id}/attendance`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f2e8] p-4 active:scale-[0.98]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-black/45">
                        {formatDate(training.training_date)}
                      </p>
                      <h3 className="truncate font-black">
                        {training.title || "Tréning"}
                      </h3>
                      <p className="truncate text-sm text-black/55">
                        {training.dojos?.name || "Bez dojo"} ·{" "}
                        {training.training_topics?.name || "Bez témy"}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-black/60">
                      Prezenčka
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {isSensei && (
            <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
                    Tím
                  </p>
                  <h2 className="text-2xl font-black">Tréneri a kōhai</h2>
                </div>

                <Link
                  href="/trainers"
                  className="rounded-2xl bg-[#d71920] px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
                >
                  Spravovať
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {trainers.slice(0, 6).map((trainer) => (
                  <div
                    key={trainer.id}
                    className="rounded-2xl bg-[#f7f2e8] p-4"
                  >
                    <p className="font-black">{trainer.full_name}</p>
                    <p className="text-sm text-black/55">{trainer.email}</p>
                    <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-black/60">
                      {trainer.role || "senpai"}
                    </p>
                  </div>
                ))}

                {kohaiHelpers.slice(0, 6).map((kohai) => (
                  <div key={kohai.id} className="rounded-2xl bg-amber-50 p-4">
                    <p className="font-black">{kohai.full_name}</p>
                    <p className="text-sm text-black/55">
                      {kohai.dojos?.name || "Bez dojo"}
                    </p>
                    <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                      kōhai
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
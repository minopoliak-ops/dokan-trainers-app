"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const columns = [
  { key: "first_name", label: "Meno" },
  { key: "last_name", label: "Priezvisko" },
  { key: "dojo_name", label: "Dojo" },
  { key: "birth_year", label: "Rok narodenia" },
  { key: "technical_grade", label: "Technický stupeň" },
  { key: "grade_system", label: "Systém stupňov" },
  { key: "last_grading_date", label: "Posledné skúšky" },
  { key: "parent_name", label: "Meno rodiča" },
  { key: "parent_phone", label: "Telefón rodiča" },
  { key: "parent_email", label: "Email rodiča" },
  { key: "health_info", label: "Zdravotné info" },
  { key: "medication_info", label: "Lieky" },
  { key: "notes", label: "Poznámky" },
  { key: "id", label: "ID" },
];

export default function Page() {
  const [dojos, setDojos] = useState<any[]>([]);
  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("dojos")
      .select("*")
      .order("name")
      .then(({ data }) => setDojos(data || []));
  }, []);

  useEffect(() => {
    async function loadCount() {
      const supabase = createClient();

      let query = supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("active", true);

      if (selectedDojoId) query = query.eq("dojo_id", selectedDojoId);

      const { count } = await query;
      setStudentsCount(count || 0);
    }

    loadCount();
  }, [selectedDojoId]);

  const selectedDojo = useMemo(() => {
    return dojos.find((dojo) => dojo.id === selectedDojoId);
  }, [dojos, selectedDojoId]);

  function csvValue(value: any) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function safeFileName(value: string) {
    return String(value || "vsetky-dojo")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  async function exportCsv() {
    setExporting(true);

    const supabase = createClient();

    let query = supabase
      .from("students")
      .select("*, dojos(name)")
      .eq("active", true)
      .order("last_name");

    if (selectedDojoId) {
      query = query.eq("dojo_id", selectedDojoId);
    }

    const { data, error } = await query;

    setExporting(false);

    if (error) return alert(error.message);
    if (!data || data.length === 0) return alert("Nie sú žiadni aktívni žiaci.");

    const rows = data.map((student: any) => ({
      ...student,
      dojo_name: student.dojos?.name || "",
    }));

    const separator = ";";

    const csv = [
      "sep=;",
      columns.map((c) => csvValue(c.label)).join(separator),
      ...rows.map((row: any) =>
        columns.map((c) => csvValue(row[c.key])).join(separator)
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const dojoName = safeFileName(selectedDojo?.name || "vsetky-dojo");
    const date = new Date().toISOString().slice(0, 10);

    a.href = url;
    a.download = `dokan-ziaci-${dojoName}-${date}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <FileSpreadsheet size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Export dát
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Export CSV
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Export aktívnych žiakov vrátane dojo, kontaktov, technických
            stupňov, zdravotných informácií a liekov.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Vybrané dojo</p>
              <p className="text-2xl font-black">
                {selectedDojo?.name || "Všetky"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Aktívni žiaci</p>
              <p className="text-3xl font-black">{studentsCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Stĺpce</p>
              <p className="text-3xl font-black">{columns.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Nastavenie exportu
          </p>
          <h2 className="text-2xl font-black">Vyber rozsah dát</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-black text-black/55">
              Dojo
            </label>

            <select
              value={selectedDojoId}
              onChange={(e) => setSelectedDojoId(e.target.value)}
              className="h-[56px] w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 text-[16px] font-bold outline-none focus:border-[#d71920] focus:bg-white"
            >
              <option value="">Všetky dojo</option>
              {dojos.map((dojo) => (
                <option key={dojo.id} value={dojo.id}>
                  {dojo.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || studentsCount === 0}
            className="inline-flex h-[56px] items-center justify-center gap-2 self-end rounded-2xl bg-[#d71920] px-6 text-[16px] font-black text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.98] disabled:opacity-50"
          >
            <Download size={20} />
            {exporting ? "Pripravujem..." : "Stiahnuť Excel CSV"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[#f7f2e8] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#111] text-white">
              <Users size={20} />
            </div>
            <p className="font-black">Aktívni žiaci</p>
            <p className="mt-1 text-sm text-black/55">
              Exportuje iba aktívnych cvičiacich.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f7f2e8] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#d71920] text-white">
              <Building2 size={20} />
            </div>
            <p className="font-black">Filter dojo</p>
            <p className="mt-1 text-sm text-black/55">
              Môžeš exportovať všetky dojo alebo len jedno.
            </p>
          </div>

          <div className="rounded-2xl bg-[#f7f2e8] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white">
              <ShieldCheck size={20} />
            </div>
            <p className="font-black">Excel kompatibilné</p>
            <p className="mt-1 text-sm text-black/55">
              CSV používa bodkočiarku a UTF-8 pre diakritiku.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
          Exportované stĺpce
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {columns.map((column) => (
            <span
              key={column.key}
              className="rounded-full bg-[#f7f2e8] px-3 py-2 text-xs font-black text-black/60"
            >
              {column.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
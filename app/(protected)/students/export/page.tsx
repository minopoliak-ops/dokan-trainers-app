"use client";

import { createClient } from "@/lib/supabase/browser";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("dojos")
      .select("*")
      .order("name")
      .then(({ data }) => setDojos(data || []));
  }, []);

  function csvValue(value: any) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  async function exportCsv() {
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

    const dojoName =
      dojos.find((d) => d.id === selectedDojoId)?.name?.replace(/\s+/g, "-") ||
      "vsetky-dojo";

    a.href = url;
    a.download = `dokan-ziaci-${dojoName}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Export CSV</h1>
        <p className="mt-2 text-sm text-white/70">
          Exportuje aktívnych žiakov vrátane dojo, kontaktov, technických
          stupňov, zdravotných informácií a liekov.
        </p>
      </div>

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 space-y-4">
        <select
          value={selectedDojoId}
          onChange={(e) => setSelectedDojoId(e.target.value)}
          className="h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px]"
        >
          <option value="">Všetky dojo</option>
          {dojos.map((dojo) => (
            <option key={dojo.id} value={dojo.id}>
              {dojo.name}
            </option>
          ))}
        </select>

        <button
          onClick={exportCsv}
          className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
        >
          <Download size={20} />
          Stiahnuť Excel CSV
        </button>
      </div>
    </div>
  );
}
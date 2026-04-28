"use client";

import { createClient } from "@/lib/supabase/browser";
import { Download } from "lucide-react";

export default function Page() {
  async function exportCsv() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("students")
      .select("*, dojos(name)")
      .order("last_name");

    if (error) return alert(error.message);
    if (!data || data.length === 0) return alert("Nie sú žiadni žiaci.");

    const rows = data.map((student: any) => {
      const { dojos, ...rest } = student;
      return {
        ...rest,
        dojo_name: dojos?.name || "",
      };
    });

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map((row: any) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dokan-ziaci-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Export CSV</h1>
        <p className="mt-2 text-sm text-white/70">
          Exportuje komplet údaje žiakov vrátane dojo, kontaktov, technických stupňov a zdravotných poznámok.
        </p>
      </div>

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <button
          onClick={exportCsv}
          className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-4 text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.25)] active:scale-[0.98]"
        >
          <Download size={20} />
          Stiahnuť CSV
        </button>
      </div>
    </div>
  );
}

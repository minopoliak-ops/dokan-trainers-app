"use client";

import { createClient } from "@/lib/supabase/browser";
import { Upload } from "lucide-react";
import { useState } from "react";

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (current || row.length) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function importCsv(file: File) {
    setLoading(true);
    setResult("");

    try {
      const text = await file.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ""));

      if (rows.length < 2) {
        alert("CSV je prázdne.");
        setLoading(false);
        return;
      }

      const headers = rows[0].map((h) => h.trim());
      const supabase = createClient();

      const { data: dojos } = await supabase.from("dojos").select("*");

      const dojoMap = new Map(
        (dojos || []).map((dojo: any) => [String(dojo.name).trim(), dojo.id])
      );

      const importRows = rows.slice(1).map((values) => {
        const item: any = {};

        headers.forEach((header, index) => {
          item[header] = values[index] ?? "";
        });

        if (item.dojo_name && !item.dojo_id) {
          item.dojo_id = dojoMap.get(String(item.dojo_name).trim()) || null;
        }

        delete item.dojo_name;
        delete item.dojos;
        delete item.created_at;
        delete item.updated_at;

        if (!item.active) item.active = true;

        Object.keys(item).forEach((key) => {
          if (item[key] === "") item[key] = null;
        });

        return item;
      });

      const { error } = await supabase.from("students").upsert(importRows, {
        onConflict: "id",
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setResult(`Import hotový. Počet riadkov: ${importRows.length}`);
    } catch (err: any) {
      alert(err?.message || "Import zlyhal.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-[28px] bg-[#111] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <h1 className="text-3xl font-extrabold">Import CSV</h1>
        <p className="mt-2 text-sm text-white/70">
          Nahraj CSV export zo systému. Importuje údaje žiakov vrátane kontaktov, dojo, technických stupňov a zdravotných poznámok.
        </p>
      </div>

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 space-y-4">
        <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-[#fafafa] p-6 text-center active:scale-[0.98]">
          <Upload className="mb-3 text-[#d71920]" size={32} />
          <span className="font-bold">
            {loading ? "Importujem..." : "Vybrať CSV súbor"}
          </span>
          <span className="mt-1 text-sm text-black/50">
            Odporúčané: CSV vytvorené cez Export CSV
          </span>

          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importCsv(file);
            }}
          />
        </label>

        {result && (
          <div className="rounded-2xl bg-green-50 p-4 font-bold text-green-800">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}

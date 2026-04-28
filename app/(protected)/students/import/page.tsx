"use client";

import { createClient } from "@/lib/supabase/browser";
import { Upload } from "lucide-react";
import { useState } from "react";

const headerMap: Record<string, string> = {
  "ID": "id",
  "Meno": "first_name",
  "Priezvisko": "last_name",
  "Dojo": "dojo_name",
  "Rok narodenia": "birth_year",
  "Technický stupeň": "technical_grade",
  "Systém stupňov": "grade_system",
  "Posledné skúšky": "last_grading_date",
  "Meno rodiča": "parent_name",
  "Telefón rodiča": "parent_phone",
  "Email rodiča": "parent_email",
  "Zdravotné info": "health_info",
  "Lieky": "medication_info",
  "Poznámky": "notes",

  id: "id",
  first_name: "first_name",
  last_name: "last_name",
  dojo_name: "dojo_name",
  birth_year: "birth_year",
  technical_grade: "technical_grade",
  grade_system: "grade_system",
  last_grading_date: "last_grading_date",
  parent_name: "parent_name",
  parent_phone: "parent_phone",
  parent_email: "parent_email",
  health_info: "health_info",
  medication_info: "medication_info",
  notes: "notes",
};

function parseCsv(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter(Boolean);

  if (lines[0]?.startsWith("sep=")) {
    lines.shift();
  }

  const firstLine = lines[0] || "";
  const separator =
    firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";

  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let insideQuotes = false;

  const source = lines.join("\n");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === separator && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
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
      const rows = parseCsv(text);

      if (rows.length < 2) {
        alert("CSV je prázdne.");
        setLoading(false);
        return;
      }

      const rawHeaders = rows[0].map((h) => h.trim());
      const headers = rawHeaders.map((h) => headerMap[h] || h);

      const supabase = createClient();

      const { data: dojos, error: dojosError } = await supabase
        .from("dojos")
        .select("*");

      if (dojosError) {
        alert(dojosError.message);
        setLoading(false);
        return;
      }

      const dojoMap = new Map(
        (dojos || []).map((dojo: any) => [String(dojo.name).trim(), dojo.id])
      );

      const importRows = rows
        .slice(1)
        .map((values) => {
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

          if (!item.first_name || !item.last_name) {
            return null;
          }

          item.active = true;

          Object.keys(item).forEach((key) => {
            if (item[key] === "") item[key] = null;
          });

          return item;
        })
        .filter(Boolean);

      if (importRows.length === 0) {
        alert("Nenašli sa žiadni žiaci na import.");
        setLoading(false);
        return;
      }

      const rowsWithId = importRows.filter((row: any) => row.id);
      const rowsWithoutId = importRows.filter((row: any) => !row.id);

      if (rowsWithId.length > 0) {
        const { error } = await supabase.from("students").upsert(rowsWithId, {
          onConflict: "id",
        });

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }
      }

      if (rowsWithoutId.length > 0) {
        const { error } = await supabase.from("students").insert(rowsWithoutId);

        if (error) {
          alert(error.message);
          setLoading(false);
          return;
        }
      }

      setResult(`Import hotový. Počet žiakov: ${importRows.length}`);
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
          Nahraj CSV z exportu. Podporuje slovenské názvy stĺpcov, dojo,
          kontakty, technické stupne, zdravotné info a lieky.
        </p>
      </div>

      <div className="rounded-[26px] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 space-y-4">
        <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-[#fafafa] p-6 text-center active:scale-[0.98]">
          <Upload className="mb-3 text-[#d71920]" size={34} />

          <span className="font-bold">
            {loading ? "Importujem..." : "Vybrať CSV súbor"}
          </span>

          <span className="mt-1 text-sm text-black/50">
            Najlepšie použiť súbor vytvorený cez Export CSV
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
"use client";

import { createClient } from "@/lib/supabase/browser";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const headerMap: Record<string, string> = {
  ID: "id",
  Meno: "first_name",
  Priezvisko: "last_name",
  Dojo: "dojo_name",
  "Rok narodenia": "birth_year",
  "Technický stupeň": "technical_grade",
  "Systém stupňov": "grade_system",
  "Posledné skúšky": "last_grading_date",
  "Meno rodiča": "parent_name",
  "Telefón rodiča": "parent_phone",
  "Email rodiča": "parent_email",
  "Zdravotné info": "health_info",
  Lieky: "medication_info",
  Poznámky: "notes",

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
  const [fileName, setFileName] = useState("");
  const [importCount, setImportCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const hasResult = !!result;
  const hasError = !!errorMessage;

  const statusText = useMemo(() => {
    if (loading) return "Importujem CSV...";
    if (hasResult) return "Import dokončený";
    if (hasError) return "Import zlyhal";
    return "Pripravené na import";
  }, [loading, hasResult, hasError]);

  async function importCsv(file: File) {
    setLoading(true);
    setResult("");
    setErrorMessage("");
    setFileName(file.name);
    setImportCount(0);
    setUpdatedCount(0);
    setNewCount(0);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length < 2) {
        throw new Error("CSV je prázdne.");
      }

      const rawHeaders = rows[0].map((h) => h.trim());
      const headers = rawHeaders.map((h) => headerMap[h] || h);

      const supabase = createClient();

      const { data: dojos, error: dojosError } = await supabase
        .from("dojos")
        .select("*");

      if (dojosError) throw new Error(dojosError.message);

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

          if (!item.first_name || !item.last_name) return null;

          item.active = true;

          Object.keys(item).forEach((key) => {
            if (item[key] === "") item[key] = null;
          });

          return item;
        })
        .filter(Boolean);

      if (importRows.length === 0) {
        throw new Error("Nenašli sa žiadni žiaci na import.");
      }

      const rowsWithId = importRows.filter((row: any) => row.id);
      const rowsWithoutId = importRows.filter((row: any) => !row.id);

      if (rowsWithId.length > 0) {
        const { error } = await supabase.from("students").upsert(rowsWithId, {
          onConflict: "id",
        });

        if (error) throw new Error(error.message);
      }

      if (rowsWithoutId.length > 0) {
        const { error } = await supabase.from("students").insert(rowsWithoutId);

        if (error) throw new Error(error.message);
      }

      setImportCount(importRows.length);
      setUpdatedCount(rowsWithId.length);
      setNewCount(rowsWithoutId.length);
      setResult(`Import hotový. Počet žiakov: ${importRows.length}`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Import zlyhal.");
      alert(err?.message || "Import zlyhal.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <div className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
            <Upload size={28} />
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Import dát
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Import CSV
          </h1>

          <p className="mt-3 max-w-2xl text-white/65">
            Nahraj CSV z exportu. Podporuje slovenské názvy stĺpcov, dojo,
            kontakty, technické stupne, zdravotné info, lieky a poznámky.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Stav</p>
              <p className="text-2xl font-black">{statusText}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Importované</p>
              <p className="text-3xl font-black">{importCount}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/50">Súbor</p>
              <p className="truncate text-lg font-black">
                {fileName || "Nevybraný"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-black/10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-black/35">
            Nahratie súboru
          </p>
          <h2 className="text-2xl font-black">Vyber CSV súbor</h2>
        </div>

        <label
          className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[30px] border-2 border-dashed p-6 text-center active:scale-[0.98] ${
            loading
              ? "border-black/10 bg-black/5"
              : "border-[#d71920]/30 bg-[#f7f2e8] hover:border-[#d71920]"
          }`}
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)]">
            <FileSpreadsheet size={32} />
          </div>

          <span className="text-xl font-black">
            {loading ? "Importujem..." : "Vybrať CSV súbor"}
          </span>

          <span className="mt-2 max-w-sm text-sm font-semibold text-black/50">
            Najlepšie použiť súbor vytvorený cez Export CSV v aplikácii.
          </span>

          {fileName && (
            <span className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-black/60">
              {fileName}
            </span>
          )}

          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importCsv(file);
            }}
          />
        </label>

        {hasResult && (
          <div className="rounded-[26px] bg-green-50 p-5 text-green-900 ring-1 ring-green-100">
            <div className="mb-3 flex items-center gap-3">
              <CheckCircle2 size={24} />
              <h3 className="text-xl font-black">Import prebehol úspešne</h3>
            </div>

            <p className="font-bold">{result}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm text-green-900/60">Spolu</p>
                <p className="text-3xl font-black">{importCount}</p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm text-green-900/60">Aktualizované</p>
                <p className="text-3xl font-black">{updatedCount}</p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm text-green-900/60">Nové</p>
                <p className="text-3xl font-black">{newCount}</p>
              </div>
            </div>
          </div>
        )}

        {hasError && (
          <div className="rounded-[26px] bg-red-50 p-5 text-red-900 ring-1 ring-red-100">
            <div className="mb-2 flex items-center gap-3">
              <AlertCircle size={24} />
              <h3 className="text-xl font-black">Import sa nepodaril</h3>
            </div>

            <p className="font-bold">{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white">
            <Users size={22} />
          </div>
          <h2 className="text-xl font-black">Žiaci</h2>
          <p className="mt-1 text-sm text-black/55">
            Import vytvorí nových žiakov alebo aktualizuje existujúcich podľa ID.
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d71920] text-white">
            <FileSpreadsheet size={22} />
          </div>
          <h2 className="text-xl font-black">CSV formát</h2>
          <p className="mt-1 text-sm text-black/55">
            Podporuje exportovaný súbor z aplikácie aj slovenské názvy stĺpcov.
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-xl font-black">Bezpečné dáta</h2>
          <p className="mt-1 text-sm text-black/55">
            Prázdne hodnoty sa uložia ako prázdne a aktívni žiaci zostanú aktívni.
          </p>
        </div>
      </div>
    </div>
  );
}
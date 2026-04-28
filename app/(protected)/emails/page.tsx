"use client";

import { createClient } from "@/lib/supabase/browser";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function EmailsPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [dojos, setDojos] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [target, setTarget] = useState("student");
  const [mode, setMode] = useState<"visual" | "html">("visual");

  const [subject, setSubject] = useState("Správa z DOKAN Bratislava");
  const [message, setMessage] = useState(
    "Dobrý deň,\n\nposielame informáciu z tréningovej zóny DOKAN Bratislava.\n\nS pozdravom,\nDOKAN Bratislava"
  );

  async function loadData() {
    const supabase = createClient();

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!email) return;

    const { data: trainer } = await supabase
      .from("trainers")
      .select("*")
      .eq("email", email)
      .single();

    if (!trainer) {
      setDojos([]);
      setStudents([]);
      return;
    }

    const isAdminUser = !!trainer.can_manage_trainers;
    setIsAdmin(isAdminUser);

    let allowedDojoIds: string[] = [];

    if (!isAdminUser) {
      const { data: links } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", trainer.id);

      allowedDojoIds = (links || []).map((l: any) => l.dojo_id);

      if (allowedDojoIds.length === 0) {
        setDojos([]);
        setStudents([]);
        return;
      }
    }

    let dojosQuery = supabase.from("dojos").select("*").order("name");

    let studentsQuery = supabase
      .from("students")
      .select("*, dojos(name)")
      .eq("active", true)
      .order("last_name");

    if (!isAdminUser) {
      dojosQuery = dojosQuery.in("id", allowedDojoIds);
      studentsQuery = studentsQuery.in("dojo_id", allowedDojoIds);
    }

    const [dojosRes, studentsRes] = await Promise.all([
      dojosQuery,
      studentsQuery,
    ]);

    if (dojosRes.error) alert(dojosRes.error.message);
    if (studentsRes.error) alert(studentsRes.error.message);

    setDojos(dojosRes.data || []);
    setStudents(studentsRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const recipients = useMemo(() => {
    if (target === "student") {
      return students.filter((s) => s.id === selectedStudentId);
    }

    if (target === "dojo") {
      return students.filter((s) => s.dojo_id === selectedDojoId);
    }

    return students;
  }, [students, target, selectedStudentId, selectedDojoId]);

  const emailRecipients = recipients.map((s) => s.parent_email).filter(Boolean);

  const phoneRecipients = recipients
    .map((s) => ({
      name: `${s.first_name} ${s.last_name}`,
      phone: String(s.parent_phone || "").replace(/\s/g, ""),
    }))
    .filter((s) => s.phone);

  const htmlMessage = message
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("\n");

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    alert("Skopírované.");
  }

  function openEmail() {
    if (emailRecipients.length === 0) {
      alert("Nie sú dostupné emailové adresy.");
      return;
    }

    const url = `mailto:${emailRecipients.join(",")}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;

    window.location.href = url;
  }

  function formatPhone(phone: string) {
    if (!phone) return "";
    if (phone.startsWith("+")) return phone;
    return "+421" + phone.replace(/^0/, "");
  }

  function whatsappLink(phone: string) {
    const clean = formatPhone(phone).replace("+", "");
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-brand-black p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Emaily rodičom</h1>
        <p className="mt-2 text-white/70">
          Email a WhatsApp správy jednotlivo, podľa dojo alebo všetkým.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">Komu poslať</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setSelectedDojoId("");
              setSelectedStudentId("");
            }}
            className="rounded-xl border px-4 py-3"
          >
            <option value="student">Jednotlivec</option>
            <option value="dojo">Celé dojo</option>
            <option value="all">
              {isAdmin ? "Všetky dojo" : "Všetky moje dojo"}
            </option>
          </select>

          {target === "student" && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="rounded-xl border px-4 py-3 md:col-span-2"
            >
              <option value="">Vyber cvičiaceho</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name} {s.first_name} — {s.dojos?.name}
                </option>
              ))}
            </select>
          )}

          {target === "dojo" && (
            <select
              value={selectedDojoId}
              onChange={(e) => setSelectedDojoId(e.target.value)}
              className="rounded-xl border px-4 py-3 md:col-span-2"
            >
              <option value="">Vyber dojo</option>
              {dojos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {target === "all" && (
            <div className="rounded-xl bg-brand-cream px-4 py-3 md:col-span-2">
              Vybrané: {isAdmin ? "všetky dojo" : "všetky moje dojo"}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">Editor správy</h2>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("visual")}
              className={`rounded-xl px-4 py-2 font-bold ${
                mode === "visual" ? "bg-brand-red text-white" : "bg-black/10"
              }`}
            >
              Vizuál
            </button>

            <button
              type="button"
              onClick={() => setMode("html")}
              className={`rounded-xl px-4 py-2 font-bold ${
                mode === "html" ? "bg-brand-red text-white" : "bg-black/10"
              }`}
            >
              HTML kód
            </button>
          </div>
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Predmet emailu"
          className="mb-3 w-full rounded-xl border px-4 py-3"
        />

        {mode === "visual" ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="w-full rounded-xl border px-4 py-3"
          />
        ) : (
          <textarea
            value={htmlMessage}
            readOnly
            rows={10}
            className="w-full rounded-xl border bg-black p-4 font-mono text-sm text-green-300"
          />
        )}

        {mode === "html" && (
          <p className="mt-2 text-sm text-black/60">
            HTML kód je vytvorený automaticky z textu. Skopíruješ ho tlačidlom
            nižšie.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <p className="text-black/60">Príjemcovia</p>
          <h2 className="text-4xl font-black">{recipients.length}</h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <p className="text-black/60">Email adresy</p>
          <h2 className="text-4xl font-black">{emailRecipients.length}</h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <p className="text-black/60">WhatsApp čísla</p>
          <h2 className="text-4xl font-black">{phoneRecipients.length}</h2>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10 md:grid-cols-4">
        <button
          onClick={openEmail}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 font-bold text-white"
        >
          <Mail size={18} /> Otvoriť email
        </button>

        <button
          onClick={() => copy(emailRecipients.join(", "))}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"
        >
          <Copy size={18} /> Kopírovať emaily
        </button>

        <button
          onClick={() => copy(message)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"
        >
          <Copy size={18} /> Kopírovať text
        </button>

        <button
          onClick={() => copy(htmlMessage)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 font-bold text-white"
        >
          <Copy size={18} /> Kopírovať HTML
        </button>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/10">
        <h2 className="mb-4 text-2xl font-bold">WhatsApp odoslanie</h2>

        {phoneRecipients.length === 0 ? (
          <p>Nie sú dostupné telefónne čísla.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {phoneRecipients.map((r) => (
              <a
                key={`${r.name}-${r.phone}`}
                href={whatsappLink(r.phone)}
                target="_blank"
                className="flex items-center justify-between rounded-2xl border border-black/10 p-4 transition hover:bg-green-50"
              >
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-black/60">{r.phone}</p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 font-bold text-white">
                  <MessageCircle size={18} />
                  WhatsApp
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
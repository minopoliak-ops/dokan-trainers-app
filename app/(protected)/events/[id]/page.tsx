"use client";

import { usePermissions } from "@/lib/usePermissions";
import { createClient } from "@/lib/supabase/browser";
import { Check, X, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Status = "present" | "absent" | null;

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { permissions } = usePermissions();

  const [event, setEvent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [external, setExternal] = useState<any[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [extFirst, setExtFirst] = useState("");
  const [extLast, setExtLast] = useState("");

  async function loadData() {
    const supabase = createClient();

    const eventRes = await supabase
      .from("events")
      .select("*, dojos(name), trainers(full_name), training_topics(name)")
      .eq("id", params.id)
      .single();

    const studentsRes = await supabase
      .from("students")
      .select("*, dojos(name)")
      .eq("active", true)
      .order("last_name");

    const attendanceRes = await supabase
      .from("event_attendance")
      .select("*, students(first_name, last_name, technical_grade, dojos(name))")
      .eq("event_id", params.id);

    const externalRes = await supabase
      .from("event_external_participants")
      .select("*")
      .eq("event_id", params.id);

    setEvent(eventRes.data);
    setStudents(studentsRes.data || []);
    setAttendance(attendanceRes.data || []);
    setExternal(externalRes.data || []);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addExternal() {
    if (!extFirst || !extLast) return;

    const supabase = createClient();

    await supabase.from("event_external_participants").insert({
      event_id: params.id,
      first_name: extFirst,
      last_name: extLast,
    });

    setExtFirst("");
    setExtLast("");
    loadData();
  }

  async function deleteExternal(id: string) {
    if (!confirm("Vymazať externého účastníka?")) return;

    const supabase = createClient();
    await supabase.from("event_external_participants").delete().eq("id", id);

    loadData();
  }

  async function toggleExternal(row: any) {
    const supabase = createClient();

    const newStatus = row.status === "present" ? "absent" : "present";

    await supabase
      .from("event_external_participants")
      .update({ status: newStatus })
      .eq("id", row.id);

    loadData();
  }

  if (!event) return <p>Načítavam...</p>;

  return (
    <div className="space-y-6 pb-40">
      {/* HEADER */}
      <div className="rounded-3xl bg-black p-6 text-white">
        <h1 className="text-2xl font-bold">{event.name}</h1>
      </div>

      {/* EXTERNAL ADD */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">Externý účastník</h2>

        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Meno"
            value={extFirst}
            onChange={(e) => setExtFirst(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
          <input
            placeholder="Priezvisko"
            value={extLast}
            onChange={(e) => setExtLast(e.target.value)}
            className="rounded-xl border px-3 py-2"
          />
        </div>

        <button
          onClick={addExternal}
          className="mt-3 w-full rounded-xl bg-red-600 py-3 font-bold text-white"
        >
          + Pridať externého
        </button>
      </div>

      {/* EXTERNAL LIST */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">Externí účastníci</h2>

        <div className="space-y-2">
          {external.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <p>
                {row.first_name} {row.last_name}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleExternal(row)}
                  className={`h-10 w-10 rounded-xl text-white ${
                    row.status === "present" ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {row.status === "present" ? <Check /> : <X />}
                </button>

                <button
                  onClick={() => deleteExternal(row.id)}
                  className="h-10 w-10 rounded-xl bg-black/10"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
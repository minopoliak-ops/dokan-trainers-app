"use client";

import { createClient } from "@/lib/supabase/browser";
import { Check, X } from "lucide-react";
import { useState } from "react";

type Status = "present" | "absent";

export default function AttendanceToggle({
  trainingId,
  studentId,
  initialStatus
}: {
  trainingId: string;
  studentId: string;
  initialStatus: Status | null;
}) {
  const [status, setStatus] = useState<Status | null>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;

    const next: Status = status === "present" ? "absent" : "present";
    const previous = status;
    setStatus(next);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("attendance")
      .upsert(
        { training_id: trainingId, student_id: studentId, status: next },
        { onConflict: "training_id,student_id" }
      );

    if (error) {
      alert(error.message);
      setStatus(previous);
    }

    setSaving(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm ${
        status === "present" ? "bg-green-600" : status === "absent" ? "bg-red-600" : "bg-black/25"
      }`}
    >
      {status === "present" ? <Check size={28} /> : <X size={28} />}
    </button>
  );
}

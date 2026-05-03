// FIXED kohai_page.tsx (token fix)

"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { useEffect, useState } from "react";

export default function KohaiPage() {
  const { permissions } = usePermissions();
  const [kohai, setKohai] = useState<any[]>([]);
  const [creating, setCreating] = useState("");

  const isAdmin = !!permissions?.can_manage_trainers;

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("trainers")
      .select("*")
      .eq("role", "kohai");

    setKohai(data || []);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function createLogin(person: any) {
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Nie si prihlásený (missing token)");
      return;
    }

    setCreating(person.id);

    const res = await fetch("/api/admin/create-trainer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`, // 🔥 FIX
      },
      body: JSON.stringify({
        full_name: person.full_name,
        email: person.email,
        kind: "kohai",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
    } else {
      alert("Účet vytvorený ✅");
    }

    setCreating("");
  }

  return (
    <div className="p-6">
      {kohai.map((p) => (
        <div key={p.id}>
          {p.full_name}
          <button onClick={() => createLogin(p)}>
            {creating === p.id ? "..." : "Vytvoriť prístup"}
          </button>
        </div>
      ))}
    </div>
  );
}

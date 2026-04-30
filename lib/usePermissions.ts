"use client";

import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [dojoIds, setDojoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;
    setMounted(true);

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (!alive) return;

      if (userError || !user) {
        setPermissions(null);
        setEmail("");
        setDojoIds([]);
        setLoading(false);
        return;
      }

      const userEmail = String(user.email || "").trim().toLowerCase();
      setEmail(userEmail);

      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (trainerError || !trainer) {
        console.error("usePermissions trainer error:", trainerError);
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      setPermissions(trainer);

      const { data: links, error: linksError } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", trainer.id);

      if (!alive) return;

      if (linksError) {
        console.error("usePermissions trainer_dojos error:", linksError);
        setDojoIds([]);
      } else {
        setDojoIds((links || []).map((x: any) => x.dojo_id));
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return {
    permissions: permissions || null,
    email,
    dojoIds,
    loading,
    mounted,
  };
}

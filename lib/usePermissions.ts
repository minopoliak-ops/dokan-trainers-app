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
    setMounted(true);

    async function load() {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || "";

      setEmail(userEmail);

      if (!userEmail) {
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      const { data: trainer } = await supabase
        .from("trainers")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (!trainer) {
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      setPermissions(trainer);

      const { data: links } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", trainer.id);

      setDojoIds((links || []).map((x: any) => x.dojo_id));
      setLoading(false);
    }

    load();
  }, []);

  return {
    permissions: permissions || {},
    email,
    dojoIds,
    loading,
    mounted,
  };
}
"use client";

import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [email, setEmail] = useState<string>("");
  const [dojoIds, setDojoIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || "";

      setEmail(userEmail);

      if (!userEmail) return;

      // tréner
      const { data: trainer } = await supabase
        .from("trainers")
        .select("*")
        .eq("email", userEmail)
        .single();

      setPermissions(trainer);

      if (!trainer) return;

      // dojo priradenia
      const { data: dojoLinks } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", trainer.id);

      const ids = (dojoLinks || []).map((d) => d.dojo_id);
      setDojoIds(ids);
    }

    load();
  }, []);

  return { permissions, email, dojoIds };
}
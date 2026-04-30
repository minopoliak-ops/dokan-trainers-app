"use client";

import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [dojoIds, setDojoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || "";

      console.log("USER:", userEmail, userData.user?.id, userError);

      setEmail(userEmail);

      if (!userEmail) {
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      console.log("TRAINER:", trainer, trainerError);

      if (!trainer || trainerError) {
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

      console.log("TRAINER DOJOS:", links, linksError);

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
  };
}
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
      setLoading(true);

      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || "";
      const userId = userData.user?.id || "";

      setEmail(userEmail);

      if (!userEmail || !userId) {
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("*")
        .or(`email.eq.${userEmail},user_id.eq.${userId}`)
        .maybeSingle();

      if (trainerError || !trainer) {
        console.error("Trainer permissions error:", trainerError);
        setPermissions(null);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      setPermissions(trainer);

      const isAdmin = !!trainer.can_manage_trainers;

      if (isAdmin) {
        const { data: allDojos, error: allDojosError } = await supabase
          .from("dojos")
          .select("id")
          .order("name");

        if (allDojosError) {
          console.error("Admin dojos error:", allDojosError);
          setDojoIds([]);
          setLoading(false);
          return;
        }

        setDojoIds((allDojos || []).map((d: any) => d.id));
        setLoading(false);
        return;
      }

      const { data: dojoLinks, error: dojoLinksError } = await supabase
        .from("trainer_dojos")
        .select("dojo_id")
        .eq("trainer_id", trainer.id);

      if (dojoLinksError) {
        console.error("Trainer dojos error:", dojoLinksError);
        setDojoIds([]);
        setLoading(false);
        return;
      }

      setDojoIds((dojoLinks || []).map((d: any) => d.dojo_id));
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
"use client";

import { createClient } from "@/lib/supabase/browser";
import { useEffect, useState } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || "";

      setEmail(userEmail);

      if (!userEmail) return;

      const { data } = await supabase
        .from("trainers")
        .select("*")
        .eq("email", userEmail)
        .single();

      setPermissions(data);
    }

    load();
  }, []);

  return { permissions, email };
}

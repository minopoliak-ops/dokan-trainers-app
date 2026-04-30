"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const supabase = createClient();

      const { data, error } = await supabase.auth.getUser();

      console.log("AUTH CHECK:", data, error);

      if (!mounted) return;

      if (!data?.user) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      setEmail(data.user.email || "");
      setChecking(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ❗ KRITICKÉ: nič nerenderuj počas loadingu (fix React #419)
  if (checking) return null;

  return (
    <>
      <Header email={email} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!data.user) {
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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8]">
        Kontrolujem prihlásenie...
      </main>
    );
  }

  return (
    <>
      <Header email={email} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
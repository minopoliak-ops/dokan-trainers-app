"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email || undefined);
      setChecking(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 text-center">
        Kontrolujem prihlásenie...
      </main>
    );
  }

  return (
    <>
      <Header email={email} />
      <main className="mx-auto max-w-7xl px-4 py-6 pb-40">
        {children}
      </main>
    </>
  );
}
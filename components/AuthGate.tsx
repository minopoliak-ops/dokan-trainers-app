"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const supabase = createClient();

    async function check() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email || undefined);
      setChecking(false);
    }

    check();
  }, [router]);

  // 🔥 KRITICKÉ — nič nerenderuj pred mount
  if (!mounted || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Kontrolujem prihlásenie...
      </main>
    );
  }

  return (
    <>
      <Header email={email} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
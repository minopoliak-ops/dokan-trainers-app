"use client";

import { createClient } from "@/lib/supabase/browser";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mino.poliak@gmail.com");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [debugText, setDebugText] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorText("");
    setDebugText("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorText(error.message);
        setDebugText(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorText(err?.message || "Neznáma chyba.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-[#f7f2e8] px-5 pt-24">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-40 bg-gradient-to-b from-black/[0.04] to-transparent" />

      <form
        onSubmit={onSubmit}
        className={`relative z-10 w-full max-w-[380px] rounded-[26px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-7 flex items-center gap-4">
          <div
            className={`transition-all delay-150 duration-500 ease-out ${
              visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            <Image
              src="/logo.png"
              alt="DOKAN logo"
              width={52}
              height={52}
              className="rounded-2xl"
              priority
            />
          </div>

          <div
            className={`transition-all delay-200 duration-500 ease-out ${
              visible ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
            }`}
          >
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#111111]">
              Trénerská zóna
            </h1>
            <p className="mt-1 text-[14px] font-medium text-black/50">
              DOKAN Bratislava
            </p>
          </div>
        </div>

        <label className="mb-2 block text-[15px] font-semibold text-[#111111]">
          Email
        </label>
        <input
          className="mb-5 h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px] outline-none transition focus:border-[#d71920] focus:bg-white"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label className="mb-2 block text-[15px] font-semibold text-[#111111]">
          Heslo
        </label>
        <input
          className="mb-5 h-[52px] w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-[16px] outline-none transition focus:border-[#d71920] focus:bg-white"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {errorText && (
          <div className="mb-5 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            <p className="font-bold">{errorText}</p>
            {debugText && (
              <p className="mt-2 text-xs text-red-500">{debugText}</p>
            )}
          </div>
        )}

        <button
          disabled={loading}
          className="h-[52px] w-full rounded-2xl bg-[#d71920] text-[16px] font-bold text-white shadow-[0_6px_14px_rgba(215,25,32,0.3)] transition active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? "Prihlasujem..." : "Prihlásiť sa"}
        </button>
      </form>
    </main>
  );
}
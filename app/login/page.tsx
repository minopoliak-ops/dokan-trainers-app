"use client";

import { createClient } from "@/lib/supabase/browser";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mino.poliak@gmail.com");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [debugText, setDebugText] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[390px] rounded-[28px] bg-white/95 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.10)]"
      >
        <div className="mb-7 flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="DOKAN logo"
            width={54}
            height={54}
            className="rounded-2xl"
            priority
          />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-[#111111]">
              Trénerská zóna
            </h1>
            <p className="mt-1 text-[15px] font-medium text-black/55">
              DOKAN Bratislava
            </p>
          </div>
        </div>

        <label className="mb-2 block text-[15px] font-semibold text-[#111111]">
          Email
        </label>
        <input
          className="mb-5 h-[54px] w-full rounded-2xl border border-black/10 bg-white px-4 text-[17px] outline-none transition focus:border-[#d71920] focus:ring-4 focus:ring-[#d71920]/10"
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
          className="mb-5 h-[54px] w-full rounded-2xl border border-black/10 bg-white px-4 text-[17px] outline-none transition focus:border-[#d71920] focus:ring-4 focus:ring-[#d71920]/10"
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
          className="h-[54px] w-full rounded-2xl bg-[#d71920] px-4 text-[17px] font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-70"
        >
          {loading ? "Prihlasujem..." : "Prihlásiť sa"}
        </button>
      </form>
    </main>
  );
}
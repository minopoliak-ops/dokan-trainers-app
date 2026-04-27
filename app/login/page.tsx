"use client";

import { createClient } from "@/lib/supabase/browser";
import { ShieldCheck } from "lucide-react";
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

      console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("EMAIL:", email.trim());

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      console.log("LOGIN DATA:", data);
      console.log("LOGIN ERROR:", error);

      if (error) {
        setErrorText(error.message);
        setDebugText(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("LOGIN CATCH ERROR:", err);
      setErrorText(err?.message || "Neznáma chyba.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-brand-red p-3 text-white">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trénerská zóna</h1>
            <p className="text-sm text-black/60">DOKAN Bratislava</p>
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          className="mb-4 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-red"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mb-2 block text-sm font-medium">Heslo</label>
        <input
          className="mb-4 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-red"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {errorText && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <p className="font-bold">{errorText}</p>
            {debugText && <p className="mt-2 text-xs text-red-500">{debugText}</p>}
          </div>
        )}

        <button disabled={loading} className="w-full rounded-xl bg-brand-red px-4 py-3 font-bold text-white shadow-sm disabled:opacity-60">
          {loading ? "Prihlasujem..." : "Prihlásiť sa"}
        </button>
      </form>
    </main>
  );
}

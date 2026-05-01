"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function ChatPage() {
  const { permissions } = usePermissions();
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainer_chat_messages")
      .select("*, trainers(full_name, email)")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();

    const supabase = createClient();

    const channel = supabase
      .channel("trainer-chat")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainer_chat_messages",
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    if (!permissions?.id) return alert("Nie si prihlásený ako tréner.");
    if (!message.trim()) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_chat_messages").insert({
      trainer_id: permissions.id,
      message: message.trim(),
    });

    if (error) return alert(error.message);

    setMessage("");
    loadMessages();
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-lg">
        <p className="text-sm text-white/60">Interná komunikácia</p>
        <h1 className="mt-1 text-3xl font-extrabold">Chat trénerov</h1>
        <p className="mt-2 text-white/70">
          Rýchle správy medzi adminom, trénermi a senpai.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/10">
        {loading ? (
          <p className="p-4 text-center text-black/60">Načítavam správy...</p>
        ) : messages.length === 0 ? (
          <p className="p-4 text-center text-black/60">
            Zatiaľ tu nie sú žiadne správy.
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto p-1">
            {messages.map((m) => {
              const mine = m.trainer_id === permissions?.id;

              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                      mine
                        ? "bg-[#d71920] text-white"
                        : "bg-[#f7f2e8] text-black"
                    }`}
                  >
                    <p className="text-xs font-bold opacity-70">
                      {m.trainers?.full_name || m.trainers?.email || "Tréner"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {m.message}
                    </p>
                    <p className="mt-2 text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleString("sk-SK")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="fixed bottom-24 left-0 right-0 z-40 mx-auto max-w-3xl px-5"
      >
        <div className="flex gap-2 rounded-3xl bg-white p-2 shadow-lg ring-1 ring-black/10">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Napíš správu..."
            className="min-w-0 flex-1 rounded-2xl px-4 py-3 outline-none"
          />

          <button
            type="submit"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d71920] text-white active:scale-[0.96]"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
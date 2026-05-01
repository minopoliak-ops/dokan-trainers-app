"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function ChatPage() {
  const { permissions } = usePermissions();

  const [trainers, setTrainers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("all");
  const [loading, setLoading] = useState(true);

  const isAllChat = selectedTrainerId === "all";

  async function loadTrainers() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("trainers")
      .select("id, full_name, email, active")
      .eq("active", true)
      .order("full_name");

    if (!error) setTrainers(data || []);
  }

  async function loadMessages() {
    if (!permissions?.id) return;

    const supabase = createClient();

    let query = supabase
      .from("trainer_chat_messages")
      .select(`
        *,
        trainers:trainer_id(full_name, email),
        recipient:recipient_trainer_id(full_name, email)
      `)
      .order("created_at", { ascending: true })
      .limit(200);

    if (isAllChat) {
      query = query.eq("room", "all");
    } else {
      query = query
        .eq("room", "direct")
        .or(
          `and(trainer_id.eq.${permissions.id},recipient_trainer_id.eq.${selectedTrainerId}),and(trainer_id.eq.${selectedTrainerId},recipient_trainer_id.eq.${permissions.id})`
        );
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrainers();
  }, []);

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
  }, [permissions?.id, selectedTrainerId]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    if (!permissions?.id) return alert("Nie si prihlásený ako tréner.");
    if (!message.trim()) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_chat_messages").insert({
      trainer_id: permissions.id,
      message: message.trim(),
      room: isAllChat ? "all" : "direct",
      recipient_trainer_id: isAllChat ? null : selectedTrainerId,
    });

    if (error) return alert(error.message);

    setMessage("");
    loadMessages();
  }

  const selectedTrainer = useMemo(() => {
    return trainers.find((t) => t.id === selectedTrainerId);
  }, [trainers, selectedTrainerId]);

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40 space-y-6">
      <div className="rounded-3xl bg-[#111] p-6 text-white shadow-lg">
        <p className="text-sm text-white/60">Interná komunikácia</p>
        <h1 className="mt-1 text-3xl font-extrabold">Chat trénerov</h1>
        <p className="mt-2 text-white/70">
          Správy pre všetkých trénerov alebo súkromne vybranému trénerovi.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/10">
        <label className="mb-2 block text-sm font-bold text-black/60">
          Komu píšeš
        </label>

        <select
          value={selectedTrainerId}
          onChange={(e) => {
            setSelectedTrainerId(e.target.value);
            setLoading(true);
          }}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="all">Všetci tréneri</option>
          {trainers
            .filter((t) => t.id !== permissions?.id)
            .map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.full_name || trainer.email}
              </option>
            ))}
        </select>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/10">
        <div className="mb-3 rounded-2xl bg-[#f7f2e8] px-4 py-3 text-sm font-bold">
          {isAllChat
            ? "Skupina: Všetci tréneri"
            : `Súkromný chat: ${
                selectedTrainer?.full_name || selectedTrainer?.email || "Tréner"
              }`}
        </div>

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
            placeholder={
              isAllChat ? "Správa pre všetkých..." : "Súkromná správa..."
            }
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
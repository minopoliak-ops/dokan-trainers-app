"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { MessageCircle, Send, Users } from "lucide-react";
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
        trainers:trainer_id(full_name, email)
      `)
      .order("created_at", { ascending: true })
      .limit(200);

    if (isAllChat) {
      query = query.eq("room", "all");
    } else {
      query = query.eq("room", "direct");
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const visibleMessages = isAllChat
      ? data || []
      : (data || []).filter((m: any) => {
          const me = permissions.id;
          const other = selectedTrainerId;

          return (
            (m.trainer_id === me && m.recipient_trainer_id === other) ||
            (m.trainer_id === other && m.recipient_trainer_id === me)
          );
        });

    setMessages(visibleMessages);
    setLoading(false);
  }

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    setLoading(true);
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
    <div className="min-h-screen bg-[#f7f2e8] px-5 py-6 pb-40">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="overflow-hidden rounded-[32px] bg-[#111] text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="p-6 md:p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d71920]">
              <MessageCircle size={28} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Interná komunikácia
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Chat trénerov
            </h1>

            <p className="mt-3 max-w-2xl text-white/65">
              Správy pre všetkých trénerov alebo súkromne vybranému trénerovi.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/10 md:p-5">
          <label className="mb-2 block text-sm font-bold text-black/60">
            Komu píšeš
          </label>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedTrainerId}
              onChange={(e) => {
                setSelectedTrainerId(e.target.value);
                setLoading(true);
              }}
              className="w-full rounded-2xl border border-black/10 bg-[#f7f2e8] px-4 py-4 font-bold outline-none"
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

            <div className="flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white">
              <Users size={18} />
              {isAllChat ? "Skupina" : "Súkromne"}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/10">
          <div className="border-b border-black/10 bg-white px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
              Aktuálny chat
            </p>

            <h2 className="mt-1 text-xl font-black">
              {isAllChat
                ? "Všetci tréneri"
                : selectedTrainer?.full_name ||
                  selectedTrainer?.email ||
                  "Vybraný tréner"}
            </h2>
          </div>

          <div className="max-h-[58vh] min-h-[360px] space-y-3 overflow-y-auto bg-[#faf7ef] p-4 md:p-6">
            {loading ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black/55 shadow-sm">
                  Načítavam správy...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
                  <MessageCircle className="mx-auto mb-3 text-[#d71920]" />
                  <p className="font-black">Zatiaľ žiadne správy</p>
                  <p className="mt-1 text-sm text-black/50">
                    Napíš prvú správu do tohto chatu.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.trainer_id === permissions?.id;

                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[26px] px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-[#d71920] text-white"
                          : "rounded-bl-md bg-white text-black ring-1 ring-black/5"
                      }`}
                    >
                      <p
                        className={`text-[11px] font-black ${
                          mine ? "text-white/70" : "text-black/45"
                        }`}
                      >
                        {m.trainers?.full_name || m.trainers?.email || "Tréner"}
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">
                        {m.message}
                      </p>

                      <p
                        className={`mt-2 text-[10px] ${
                          mine ? "text-white/55" : "text-black/35"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString("sk-SK")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form
          onSubmit={sendMessage}
          className="fixed bottom-24 left-0 right-0 z-40 mx-auto max-w-5xl px-5"
        >
          <div className="flex gap-2 rounded-[26px] bg-white p-2 shadow-[0_12px_35px_rgba(0,0,0,0.18)] ring-1 ring-black/10">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isAllChat ? "Správa pre všetkých..." : "Súkromná správa..."
              }
              className="min-w-0 flex-1 rounded-2xl bg-[#f7f2e8] px-4 py-4 font-medium outline-none"
            />

            <button
              type="submit"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#d71920] text-white shadow-[0_8px_18px_rgba(215,25,32,0.25)] active:scale-[0.96]"
            >
              <Send size={22} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
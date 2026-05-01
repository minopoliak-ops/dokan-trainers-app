"use client";

import { createClient } from "@/lib/supabase/browser";
import { usePermissions } from "@/lib/usePermissions";
import { Bell, BellOff, MessageCircle, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

export default function ChatPage() {
  const { permissions } = usePermissions();

  const messagesBoxRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);

  const [trainers, setTrainers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const isAllChat = selectedTrainerId === "all";

  function scrollMessagesToBottom() {
    setTimeout(() => {
      const box = messagesBoxRef.current;
      if (!box) return;
      box.scrollTop = box.scrollHeight;
    }, 120);
  }

  function scrollPageToChat() {
    setTimeout(() => {
      const el = chatSectionRef.current;
      if (!el) return;

      const headerOffset = 95;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({
        top,
        behavior: "smooth",
      });
    }, 250);
  }

  async function loadTrainers() {
    const supabase = createClient();

    const { data } = await supabase
      .from("trainers")
      .select("id, full_name, email, active")
      .eq("active", true)
      .order("full_name");

    setTrainers(data || []);
  }

  async function loadNotificationSetting() {
    if (!permissions?.id) return;

    const supabase = createClient();

    const { data } = await supabase
      .from("trainers")
      .select("chat_notifications_enabled")
      .eq("id", permissions.id)
      .maybeSingle();

    setNotificationsEnabled(data?.chat_notifications_enabled !== false);
  }

  async function toggleNotifications() {
    if (!permissions?.id) return;

    setSavingNotifications(true);

    const next = !notificationsEnabled;
    const supabase = createClient();

    const { error } = await supabase
      .from("trainers")
      .update({ chat_notifications_enabled: next })
      .eq("id", permissions.id);

    setSavingNotifications(false);

    if (error) return alert(error.message);

    setNotificationsEnabled(next);
  }

  async function markMessagesAsRead(items: any[]) {
    if (!permissions?.id) return;

    const supabase = createClient();
    const me = permissions.id;

    for (const m of items) {
      if (m.trainer_id === me) continue;

      const readBy = Array.isArray(m.read_by) ? m.read_by : [];
      if (readBy.includes(me)) continue;

      await supabase
        .from("trainer_chat_messages")
        .update({ read_by: [...readBy, me] })
        .eq("id", m.id);
    }
  }

  async function loadMessages() {
    if (!permissions?.id) return;

    const supabase = createClient();

    let query = supabase
      .from("trainer_chat_messages")
      .select("*, trainers:trainer_id(full_name, email)")
      .order("created_at", { ascending: true })
      .limit(200);

    query = isAllChat ? query.eq("room", "all") : query.eq("room", "direct");

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    const visible = isAllChat
      ? data || []
      : (data || []).filter((m: any) => {
          const me = permissions.id;
          const other = selectedTrainerId;

          return (
            (m.trainer_id === me && m.recipient_trainer_id === other) ||
            (m.trainer_id === other && m.recipient_trainer_id === me)
          );
        });

    setMessages(visible);
    setLoading(false);

    markMessagesAsRead(visible);
    scrollMessagesToBottom();
    scrollPageToChat();
  }

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    loadNotificationSetting();
  }, [permissions?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("trainer");

    if (fromUrl) {
      setSelectedTrainerId(fromUrl);
      localStorage.setItem("dokan-last-chat", fromUrl);
      return;
    }

    const saved = localStorage.getItem("dokan-last-chat");
    if (saved) setSelectedTrainerId(saved);
  }, []);

  useEffect(() => {
    if (!permissions?.id) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("dokan-last-chat", selectedTrainerId);
    }

    setLoading(true);
    loadMessages();

    const supabase = createClient();

    const channel = supabase
      .channel("trainer-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainer_chat_messages" },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissions?.id, selectedTrainerId]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages.length]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    if (!permissions?.id || !message.trim()) return;

    const supabase = createClient();

    const { error } = await supabase.from("trainer_chat_messages").insert({
      trainer_id: permissions.id,
      message: message.trim(),
      room: isAllChat ? "all" : "direct",
      recipient_trainer_id: isAllChat ? null : selectedTrainerId,
      read_by: [permissions.id],
    });

    if (error) return alert(error.message);

    setMessage("");
    loadMessages();
  }

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedTrainerId),
    [trainers, selectedTrainerId]
  );

  return (
    <div className="min-h-screen bg-[#f7f2e8] px-4 pt-1 pb-40">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="rounded-2xl bg-[#111] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d71920]">
              <MessageCircle />
            </div>
            <div>
              <p className="text-xs text-white/50">Interná komunikácia</p>
              <h1 className="text-2xl font-black">Chat trénerov</h1>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Notifikácie</span>
            <button
              type="button"
              onClick={toggleNotifications}
              disabled={savingNotifications}
              className={`rounded-xl px-4 py-2 font-bold text-white disabled:opacity-60 ${
                notificationsEnabled ? "bg-red-600" : "bg-gray-400"
              }`}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <select
            value={selectedTrainerId}
            onChange={(e) => {
              setSelectedTrainerId(e.target.value);
              setLoading(true);
            }}
            className="w-full rounded-xl bg-[#f7f2e8] p-3 font-bold"
          >
            <option value="all">Všetci tréneri</option>
            {trainers
              .filter((t) => t.id !== permissions?.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </option>
              ))}
          </select>
        </div>

        <div ref={chatSectionRef} className="overflow-hidden rounded-2xl bg-white">
          <div className="border-b border-black/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Aktuálny chat
            </p>
            <h2 className="text-lg font-black">
              {isAllChat
                ? "Všetci tréneri"
                : selectedTrainer?.full_name ||
                  selectedTrainer?.email ||
                  "Vybraný tréner"}
            </h2>
          </div>

          <div
            ref={messagesBoxRef}
            className="h-[52vh] space-y-3 overflow-y-auto bg-[#faf7ef] p-4"
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black/55">
                  Načítavam správy...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
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
                      className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-red-600 text-white"
                          : "rounded-bl-md bg-white text-black"
                      }`}
                    >
                      <div className="text-xs opacity-70">
                        {m.trainers?.full_name || m.trainers?.email || "Tréner"}
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form onSubmit={sendMessage} className="fixed bottom-24 left-0 right-0 px-4">
          <div className="mx-auto flex max-w-5xl gap-2 rounded-2xl bg-white p-2 shadow">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-w-0 flex-1 rounded-xl bg-[#f7f2e8] p-3"
              placeholder="Správa..."
            />
            <button className="rounded-xl bg-red-600 px-4 text-white">
              <Send />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
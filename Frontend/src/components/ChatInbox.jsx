import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { formatPlace } from "../utils/display.js";
import { listConversations, listMessages, sendMessage } from "../services/communicationService.js";

function timeLabel(value) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function ChatInbox({ driver = false }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messagePane = useRef(null);
  const activeConversation = conversations.find((item) => item.booking._id === activeBookingId);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const result = await listConversations();
        if (active) {
          setConversations(result);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    refresh();
    const intervalId = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    if (!activeBookingId) return undefined;
    let active = true;
    async function refreshMessages() {
      try {
        const result = await listMessages(activeBookingId);
        if (active) {
          setMessages((current) => {
            const byId = new Map(current.map((message) => [message._id, message]));
            result.messages.forEach((message) => byId.set(message._id, message));
            return [...byId.values()].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
          });
          setHasMore(result.hasMore);
          setCanSend(result.canSend);
          setConversations((current) => current.map((item) => item.booking._id === activeBookingId
            ? { ...item, unreadCount: 0, booking: { ...item.booking, status: result.bookingStatus }, canSend: result.canSend }
            : item));
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    refreshMessages();
    const intervalId = window.setInterval(refreshMessages, 4000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, [activeBookingId]);

  useEffect(() => {
    if (messagePane.current) messagePane.current.scrollTop = messagePane.current.scrollHeight;
  }, [messages[messages.length - 1]?._id]);

  async function loadEarlierMessages() {
    if (!activeBookingId || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const result = await listMessages(activeBookingId, messages[0].createdAt);
      setMessages((current) => {
        const byId = new Map(result.messages.map((message) => [message._id, message]));
        current.forEach((message) => byId.set(message._id, message));
        return [...byId.values()].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
      });
      setHasMore(result.hasMore);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeBookingId || !canSend || busy) return;
    setBusy(true);
    setError("");
    try {
      const message = await sendMessage(activeBookingId, text, crypto.randomUUID());
      setMessages((current) => [...current, message]);
      setDraft("");
      setConversations((current) => current.map((item) => item.booking._id === activeBookingId ? { ...item, latestMessage: message } : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full min-h-[calc(100vh-2rem)] max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-4">Messages</h1>
      <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-xl border border-cardBorder bg-plum text-plumText md:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${activeBookingId ? "hidden md:block" : ""} border-b md:border-b-0 md:border-r border-plumBorder overflow-y-auto`}>
          <h2 className="px-4 py-3 text-xs uppercase tracking-wide text-plumMuted">Booking conversations</h2>
          {conversations.length === 0 && <p className="px-4 py-8 text-sm text-plumMuted">Conversations appear after a booking is confirmed.</p>}
          {conversations.map((conversation) => {
            const route = `${formatPlace(conversation.ride.pickup.address)} to ${formatPlace(conversation.ride.destination.address)}`;
            return <button type="button" key={conversation.booking._id} onClick={() => { setActiveBookingId(conversation.booking._id); setMessages([]); setError(""); }} className={`w-full text-left px-4 py-3 border-t border-plumBorder hover:bg-plumCard ${activeBookingId === conversation.booking._id ? "bg-plumCard" : ""}`}>
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium truncate">{conversation.participant?.name || (driver ? "Passenger" : "Driver")}</span>{conversation.unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-rose text-plumText text-xs flex items-center justify-center">{conversation.unreadCount}</span>}</span>
              <span title={`${conversation.ride.pickup.address} to ${conversation.ride.destination.address}`} className="block mt-1 text-xs text-plumMuted truncate">{route}</span>
              <span className="block mt-1 text-xs text-plumMuted">{conversation.booking.status} · {conversation.latestMessage?.text || "No messages yet"}</span>
            </button>;
          })}
        </aside>
        <section className={`${activeBookingId ? "flex" : "hidden md:flex"} min-w-0 flex-col`}>
          {activeConversation ? <>
            <header className="flex items-center gap-3 px-4 py-3 border-b border-plumBorder">
              <button type="button" onClick={() => setActiveBookingId(null)} aria-label="Back to conversations" className="md:hidden text-plumMuted"><ArrowLeft size={18} /></button>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{activeConversation.participant?.name || (driver ? "Passenger" : "Driver")}</p><p title={`${activeConversation.ride.pickup.address} to ${activeConversation.ride.destination.address}`} className="text-xs text-plumMuted truncate">{formatPlace(activeConversation.ride.pickup.address)} to {formatPlace(activeConversation.ride.destination.address)}</p></div>
              <span className="text-xs text-plumMuted capitalize">{activeConversation.booking.status}</span>
            </header>
            <div ref={messagePane} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {hasMore && <button type="button" onClick={loadEarlierMessages} disabled={loadingOlder} className="self-center text-xs text-sageBright disabled:opacity-60">{loadingOlder ? "Loading..." : "Load earlier messages"}</button>}
              {messages.map((message) => {
                const mine = String(message.sender?._id) === String(user?.id);
                return <article key={message._id} className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm ${mine ? "self-end bg-rose text-plumText" : "self-start bg-plumCardAlt border border-plumBorder"}`}>
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <time className="block text-[10px] mt-1 text-plumMuted">{timeLabel(message.createdAt)}</time>
                </article>;
              })}
              {!messages.length && <p className="text-center text-sm text-plumMuted py-8">Start the conversation about this booking.</p>}
            </div>
            {!canSend && <p className="px-4 py-3 border-t border-plumBorder text-xs text-plumMuted">This booking is {activeConversation.booking.status}. Conversation history is read-only.</p>}
            {canSend && <form onSubmit={submitMessage} className="flex items-center gap-2 px-4 py-3 border-t border-plumBorder">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} aria-label="Message" placeholder="Type a message..." className="min-w-0 flex-1 bg-plumCard rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-plumMuted" />
              <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message" className="w-10 h-10 rounded-lg bg-rose text-plumText flex items-center justify-center disabled:opacity-60"><Send size={16} /></button>
            </form>}
          </> : <div className="flex-1 flex items-center justify-center text-sm text-plumMuted">Choose a booking conversation.</div>}
        </section>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-coral">{error}</p>}
    </div>
  );
}
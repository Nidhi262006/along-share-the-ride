import { useEffect, useState } from "react";
import { Bell, Car, MessageSquare, XCircle, Sparkles, Check } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../services/communicationService.js";

const eventIcons = {
  booking_requested: Car,
  booking_confirmed: Car,
  booking_cancelled: XCircle,
  ride_cancelled: XCircle,
  ride_updated: Car,
  ride_completed: Check,
  new_message: MessageSquare,
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const result = await listNotifications();
      setItems(result.notifications);
      setUnreadCount(result.unreadCount);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function markRead(notification) {
    if (notification.readAt) return;
    try {
      await markNotificationRead(notification._id);
      setItems((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="bg-plum text-plumText min-h-full p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2"><Bell size={19} /><h1 className="font-heading text-2xl font-semibold">Notifications</h1>{unreadCount > 0 && <span className="rounded-full bg-rose px-2 py-0.5 text-xs">{unreadCount}</span>}</div>
        <button type="button" onClick={markAllRead} disabled={!unreadCount} className="text-xs text-sageBright disabled:opacity-50">Mark all as read</button>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
      {!items.length && !error && <p className="rounded-xl bg-plumCard px-4 py-8 text-center text-sm text-plumMuted">No notifications yet.</p>}
      <div className="flex flex-col gap-2">
        {items.map((notification) => {
          const Icon = eventIcons[notification.eventType] || Sparkles;
          return (
            <button type="button" key={notification._id} onClick={() => markRead(notification)} className={`w-full text-left flex items-center gap-3 bg-plumCard rounded-xl px-4 py-3.5 ${notification.readAt ? "opacity-70" : ""}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sageBright bg-sage/20"><Icon size={16} /></div>
              <span className="min-w-0 flex-1"><span className="block text-sm">{notification.title}</span><span className="block text-xs text-plumMuted mt-0.5">{notification.message}</span><time className="block text-[10px] text-plumMuted mt-1">{new Date(notification.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></span>
              {!notification.readAt && <span className="w-2 h-2 rounded-full bg-rose shrink-0" aria-label="Unread" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

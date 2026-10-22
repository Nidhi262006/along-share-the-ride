import { useEffect, useState } from "react";
import { listConversations, listNotifications } from "../services/communicationService.js";

export default function useCommunicationCounts() {
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const [conversations, notifications] = await Promise.all([listConversations(), listNotifications()]);
        if (active) setCounts({
          messages: conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
          notifications: notifications.unreadCount,
        });
      } catch {
        if (active) setCounts({ messages: 0, notifications: 0 });
      }
    }
    refresh();
    const intervalId = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, []);

  return counts;
}
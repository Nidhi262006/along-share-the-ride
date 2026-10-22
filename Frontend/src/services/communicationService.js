import { request } from "./authService.js";

export async function listConversations() {
  return (await request("/chat/conversations")).conversations;
}

export async function listMessages(bookingId, before) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return request(`/chat/${encodeURIComponent(bookingId)}/messages${query}`);
}

export async function sendMessage(bookingId, text, clientMessageId) {
  return (await request(`/chat/${encodeURIComponent(bookingId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, clientMessageId }),
  })).message;
}

export async function listNotifications() {
  return request("/notifications");
}

export async function markNotificationRead(notificationId) {
  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "PATCH" });
}
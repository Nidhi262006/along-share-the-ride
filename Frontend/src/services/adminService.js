import { request } from "./authService.js";

export async function getAdminOverview() { return request("/admin/overview"); }
export async function searchAdminUsers(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "")).toString();
  return request(`/admin/users${query ? `?${query}` : ""}`);
}
export async function getAdminUser(userId) { return request(`/admin/users/${encodeURIComponent(userId)}`); }
export async function setAccountSuspension(userId, suspended) {
  return request(`/admin/users/${encodeURIComponent(userId)}/suspension`, { method: "PATCH", body: JSON.stringify({ suspended, confirmed: true }) });
}
export async function listAdminApplications() { return request("/admin/drivers/applications"); }
export async function reviewDriver(driverId, status, rejectionReason = "") {
  return request(`/admin/drivers/${encodeURIComponent(driverId)}/verification`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason, confirmed: true }) });
}
export async function getAdminRides() { return request("/admin/rides"); }
export async function moderateRide(rideId, reason) {
  return request(`/admin/rides/${encodeURIComponent(rideId)}/moderation`, { method: "PATCH", body: JSON.stringify({ reason, confirmed: true }) });
}
export async function listAdminReports() { return request("/admin/reports"); }
export async function updateAdminReport(reportId, status, resolution) {
  return request(`/admin/reports/${encodeURIComponent(reportId)}`, { method: "PATCH", body: JSON.stringify({ status, resolution, confirmed: true }) });
}

export async function downloadDriverDocument(driverId, documentId) {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3002/api";
  const response = await fetch(`${apiBase}/admin/drivers/${encodeURIComponent(driverId)}/documents/${encodeURIComponent(documentId)}`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to download this private document");
  return response.blob();
}
import { request } from "./authService.js";

export async function getDriverApplication() {
  return request("/driver/application");
}

export async function saveDriverProfile(profile) {
  return request("/driver/application", { method: "PATCH", body: JSON.stringify({ profile }) });
}

export async function uploadDriverDocument(type, file) {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3002/api";
  let response;
  try {
    response = await fetch(`${apiBase}/driver/application/documents/${encodeURIComponent(type)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
      body: file,
    });
  } catch {
    throw new Error("Unable to reach RouteMate. Check that the backend is running.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Document upload failed");
  return data.document;
}

export async function submitDriverApplication() {
  return request("/driver/application/submit", { method: "POST" });
}
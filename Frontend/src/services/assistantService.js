import { request } from "./authService.js";

export async function parseRideRequest(text, context) {
  return request("/assistant/ride-request", {
    method: "POST",
    body: JSON.stringify({ text, ...(context ? { context } : {}) }),
  });
}
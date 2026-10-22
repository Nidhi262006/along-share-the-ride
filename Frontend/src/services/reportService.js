import { request } from "./authService.js";

export async function createReport(report) {
  return (await request("/reports", { method: "POST", body: JSON.stringify(report) })).report;
}
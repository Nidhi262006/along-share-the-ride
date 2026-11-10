const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002/api";

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to reach along. Check that the backend is running.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || "The request could not be completed");
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function createAccount(credentials) {
  const data = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return data.user;
}

export async function loginAccount(credentials) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return data.user;
}

export async function getCurrentUser() {
  try {
    const data = await request("/auth/me");
    return data.user;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export async function updateAccountRole(role, serviceCity) {
  const data = await request("/auth/role", {
    method: "PATCH",
    body: JSON.stringify({ role, serviceCity }),
  });
  return data.user;
}

export async function endSession() {
  await request("/auth/logout", { method: "POST" });
}
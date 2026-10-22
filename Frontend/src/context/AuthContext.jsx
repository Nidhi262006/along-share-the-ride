import { createContext, useContext, useEffect, useState } from "react";
import {
  createAccount,
  endSession,
  getCurrentUser,
  loginAccount,
  updateAccountRole,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function authenticate(mode, credentials) {
    const authenticatedUser = mode === "signup"
      ? await createAccount(credentials)
      : await loginAccount(credentials);
    setUser(authenticatedUser);
    return authenticatedUser;
  }

  async function chooseRole(role, serviceCity) {
    const updatedUser = await updateAccountRole(role, serviceCity);
    setUser(updatedUser);
    return updatedUser;
  }

  async function logout() {
    await endSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticate, chooseRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
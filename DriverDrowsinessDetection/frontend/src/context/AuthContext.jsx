import { useCallback, useEffect, useState } from "react";
import { authApi } from "../api/client";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const res = await authApi.profile();
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadProfile();
    })();
  }, [loadProfile]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (data) => {
    const res = await authApi.signup(data);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}


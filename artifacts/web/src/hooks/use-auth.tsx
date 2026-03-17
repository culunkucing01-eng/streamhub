import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));
  const [, setLocation] = useLocation();

  // The hook will automatically fail if no token is present and the backend returns 401
  const { data: user, isLoading, error, refetch } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      retry: false,
      enabled: !!token,
    }
  });

  useEffect(() => {
    if (error) {
      const status = error instanceof Response ? error.status : undefined;
      if (status === 401) {
        logout();
      }
    }
  }, [error]);

  const setToken = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setTokenState(newToken);
    refetch();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setTokenState(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isLoading && !!token,
      isAuthenticated: !!user,
      logout,
      setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

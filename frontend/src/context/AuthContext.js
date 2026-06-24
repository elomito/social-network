import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext({
  token: null,
  setToken: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, setToken, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

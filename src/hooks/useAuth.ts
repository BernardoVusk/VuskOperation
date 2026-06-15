import { useState, useEffect } from "react";

const AUTH_KEY = "vusk_auth";
const OPERATOR_KEY = "vusk_operator";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [currentOperator, setCurrentOperator] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedAuth = sessionStorage.getItem(AUTH_KEY);
      const storedOperator = sessionStorage.getItem(OPERATOR_KEY);
      
      if (storedAuth === "true" && storedOperator) {
        setIsAuthenticated(true);
        setCurrentOperator(storedOperator);
      }
    } catch (e) {
      console.error("Session storage access error on mount:", e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const authenticate = (operatorName: string) => {
    try {
      sessionStorage.setItem(AUTH_KEY, "true");
      sessionStorage.setItem(OPERATOR_KEY, operatorName);
      setIsAuthenticated(true);
      setCurrentOperator(operatorName);
    } catch (e) {
      console.error("Session storage save error:", e);
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(OPERATOR_KEY);
      setIsAuthenticated(false);
      setCurrentOperator(null);
    } catch (e) {
      console.error("Session storage clearance error during logout:", e);
    }
  };

  return { isAuthenticated, isChecking, currentOperator, authenticate, logout };
}

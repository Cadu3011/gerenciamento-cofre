"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface BalanceFisicContextProps {
  updatedAt: number;
  refresh: () => void;
}

const BalanceFisicContext = createContext<BalanceFisicContextProps | null>(
  null
);

export const BalanceFisicProvider = ({ children }: { children: ReactNode }) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  const refresh = () => setUpdatedAt(Date.now());

  return (
    <BalanceFisicContext.Provider value={{ updatedAt, refresh }}>
      {children}
    </BalanceFisicContext.Provider>
  );
};

export const useBalanceFisic = () => {
  const context = useContext(BalanceFisicContext);
  if (!context) {
    throw new Error(
      "useBalanceFisic deve ser usado dentro de BalanceFisicProvider"
    );
  }
  return context;
};

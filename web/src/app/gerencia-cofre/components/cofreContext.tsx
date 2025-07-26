"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface CofreContextProps {
  updatedAt: number;
  refresh: () => void;
}

const CofreContext = createContext<CofreContextProps | null>(null);

export const CofreProvider = ({ children }: { children: ReactNode }) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  const refresh = () => setUpdatedAt(Date.now());

  return (
    <CofreContext.Provider value={{ updatedAt, refresh }}>
      {children}
    </CofreContext.Provider>
  );
};

export const useCofreFisic = () => {
  const context = useContext(CofreContext);
  if (!context) {
    throw new Error(" deve ser usado dentro de BalanceFisicProvider");
  }
  return context;
};

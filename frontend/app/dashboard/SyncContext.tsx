"use client";
import React, { createContext, useContext, useState } from "react";

// lets SyncButton tell other components (like WeeklySummary) that fresh
// activity data was just synced in, without them being siblings in the tree
type SyncContextType = {
  syncSignal: number;
  notifySync: () => void;
};

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncSignal, setSyncSignal] = useState(0);

  function notifySync() {
    setSyncSignal((prev) => prev + 1);
  }

  return (
    <SyncContext.Provider value={{ syncSignal, notifySync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}

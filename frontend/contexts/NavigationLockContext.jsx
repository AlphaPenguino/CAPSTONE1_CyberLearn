import React, { createContext, useContext, useMemo, useState } from "react";

const NavigationLockContext = createContext(null);

export function NavigationLockProvider({ children }) {
  const [isNavigationLocked, setNavigationLocked] = useState(false);

  const value = useMemo(
    () => ({ isNavigationLocked, setNavigationLocked }),
    [isNavigationLocked]
  );

  return (
    <NavigationLockContext.Provider value={value}>
      {children}
    </NavigationLockContext.Provider>
  );
}

export function useNavigationLock() {
  const context = useContext(NavigationLockContext);
  if (!context) {
    throw new Error("useNavigationLock must be used within NavigationLockProvider");
  }
  return context;
}

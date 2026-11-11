
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserModeContextType {
  isUserMode: boolean;
  toggleUserMode: () => void;
  setUserMode: (val: boolean) => void;
}

const UserModeContext = createContext<UserModeContextType>({
  isUserMode: false,
  toggleUserMode: () => {},
  setUserMode: () => {},
});

export const UserModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUserMode, setIsUserMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sahaya_user_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleUserMode = () => {
    setIsUserMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sahaya_user_mode', String(next));
      } catch {}
      return next;
    });
  };

  const setUserMode = (val: boolean) => {
    setIsUserMode(val);
    try {
      localStorage.setItem('sahaya_user_mode', String(val));
    } catch {}
  };

  return (
    <UserModeContext.Provider value={{ isUserMode, toggleUserMode, setUserMode }}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = () => useContext(UserModeContext);

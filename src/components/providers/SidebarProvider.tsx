
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebarToggle = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarToggle must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Handle mobile initial state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

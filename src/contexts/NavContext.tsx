import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface NavCtxType {
  dynamicTitle: string | null;
  dynamicBreadcrumb: BreadcrumbItem[] | null;
  setNav: (title: string | null, breadcrumb?: BreadcrumbItem[] | null) => void;
}

const NavContext = createContext<NavCtxType>({
  dynamicTitle: null,
  dynamicBreadcrumb: null,
  setNav: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [dynamicBreadcrumb, setDynamicBreadcrumb] = useState<BreadcrumbItem[] | null>(null);

  const setNav = (title: string | null, breadcrumb?: BreadcrumbItem[] | null) => {
    setDynamicTitle(title);
    setDynamicBreadcrumb(breadcrumb ?? null);
  };

  return (
    <NavContext.Provider value={{ dynamicTitle, dynamicBreadcrumb, setNav }}>
      {children}
    </NavContext.Provider>
  );
}

export const useNav = () => useContext(NavContext);

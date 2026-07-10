import React, { createContext, useCallback, useContext, useState } from 'react';

import type { LinkWishDraft } from '@/linkImport';

export type Screen =
    | { name: 'listDetail'; listId: string }
    | { name: 'itemDetail'; itemId: string }
    | { name: 'itemForm'; listId: string; itemId?: string; draft?: LinkWishDraft }
    | { name: 'listForm'; listId?: string }
    | { name: 'importLink'; listId: string };

export type TabName = 'home' | 'stats' | 'settings';

export interface Nav {
    tab: TabName;
    stack: Screen[];
    setTab: (t: TabName) => void;
    push: (s: Screen) => void;
    pop: () => void;
    popToRoot: () => void;
}

const NavContext = createContext<Nav | null>(null);
export const useNav = (): Nav => {
    const ctx = useContext(NavContext);
    if (!ctx) throw new Error('useNav must be used inside NavProvider');
    return ctx;
};

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tab, setTab] = useState<TabName>('home');
    const [stack, setStack] = useState<Screen[]>([]);
    const push = useCallback((s: Screen) => setStack((st) => [...st, s]), []);
    const pop = useCallback(() => setStack((st) => st.slice(0, -1)), []);
    const popToRoot = useCallback(() => setStack([]), []);
    return (
        <NavContext.Provider value={{ tab, stack, setTab, push, pop, popToRoot }}>
            {children}
        </NavContext.Provider>
    );
};

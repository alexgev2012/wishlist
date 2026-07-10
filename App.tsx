/**
 * ✨ WISHLY — a wishlist app
 * React Native + TypeScript
 *
 * Features:
 *  - Multiple wishlists with emoji, color & budget
 *  - Items: price, currency, quantity, priority, category, tags,
 *    notes, store link, image URL, favorite, purchased state
 *  - Search / 4 filters / 6 sort modes
 *  - Budget tracking + progress bars + over-budget warning
 *  - Stats dashboard (totals per currency, category breakdown, records)
 *  - Duplicate / move item between lists / clear purchased
 *  - Archive lists, delete with UNDO snackbar
 *  - Share list as text, dark mode, compact mode, settings
 *  - AsyncStorage persistence, input validation
 */

import React from 'react';

import { AppShell } from '@/navigation/Router';
import { NavProvider } from '@/navigation/NavState';
import { AppProvider } from '@/state/AppState';

export default function App(): React.JSX.Element {
    return (
        <AppProvider>
            <NavProvider>
                <AppShell />
            </NavProvider>
        </AppProvider>
    );
}

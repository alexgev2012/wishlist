import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LIST_COLORS } from '@/constants';
import { darkTheme, lightTheme, Theme } from '@/theme';
import type { Action, AppSettings, AppState, WishItem } from '@/types';
import { generateId } from '@/utils';

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'HYDRATE':
            return action.payload;
        case 'ADD_LIST':
            return { ...state, lists: [...state.lists, action.payload] };
        case 'UPDATE_LIST':
            return { ...state, lists: state.lists.map((l) => (l.id === action.payload.id ? action.payload : l)) };
        case 'DELETE_LIST':
            return {
                ...state,
                lists: state.lists.filter((l) => l.id !== action.payload.id),
                items: state.items.filter((i) => i.listId !== action.payload.id),
            };
        case 'TOGGLE_ARCHIVE_LIST':
            return {
                ...state,
                lists: state.lists.map((l) => (l.id === action.payload.id ? { ...l, archived: !l.archived } : l)),
            };
        case 'ADD_ITEM':
            return { ...state, items: [...state.items, action.payload] };
        case 'UPDATE_ITEM':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.id === action.payload.id ? { ...action.payload, updatedAt: Date.now() } : i
                ),
            };
        case 'DELETE_ITEM':
            return { ...state, items: state.items.filter((i) => i.id !== action.payload.id) };
        case 'RESTORE_ITEM':
            return { ...state, items: [...state.items, action.payload] };
        case 'TOGGLE_PURCHASED':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.id === action.payload.id
                        ? { ...i, purchased: !i.purchased, purchasedAt: !i.purchased ? Date.now() : undefined, updatedAt: Date.now() }
                        : i
                ),
            };
        case 'TOGGLE_FAVORITE':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.id === action.payload.id ? { ...i, favorite: !i.favorite, updatedAt: Date.now() } : i
                ),
            };
        case 'DUPLICATE_ITEM': {
            const src = state.items.find((i) => i.id === action.payload.id);
            if (!src) return state;
            return {
                ...state,
                items: [
                    ...state.items,
                    {
                        ...src,
                        id: action.payload.newId,
                        title: `${src.title} (copy)`,
                        purchased: false,
                        purchasedAt: undefined,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                ],
            };
        }
        case 'MOVE_ITEM':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.id === action.payload.id ? { ...i, listId: action.payload.targetListId, updatedAt: Date.now() } : i
                ),
            };
        case 'CLEAR_PURCHASED':
            return {
                ...state,
                items: state.items.filter((i) => !(i.listId === action.payload.listId && i.purchased)),
            };
        case 'UPDATE_SETTINGS':
            return { ...state, settings: { ...state.settings, ...action.payload } };
        case 'RESET_ALL':
            return { ...initialState, settings: state.settings };
        default:
            return state;
    }
}

const defaultSettings: AppSettings = { darkMode: false, defaultCurrency: 'USD', compactMode: false };
const initialState: AppState = { lists: [], items: [], settings: defaultSettings };
const STORAGE_KEY = '@wishly/state/v1';

export interface Snackbar { message: string; undo?: () => void }

interface Ctx {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    hydrated: boolean;
    theme: Theme;
    snackbar: Snackbar | null;
    showSnackbar: (s: Snackbar) => void;
    dismissSnackbar: () => void;
    deleteItemWithUndo: (item: WishItem) => void;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [hydrated, setHydrated] = useState(false);
    const [snackbar, setSnackbar] = useState<Snackbar | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (raw) {
                    const saved = JSON.parse(raw) as AppState;
                    dispatch({ type: 'HYDRATE', payload: { ...saved, settings: { ...defaultSettings, ...saved.settings } } });
                } else {
                    dispatch({
                        type: 'ADD_LIST',
                        payload: { id: generateId(), name: 'My Wishlist', emoji: '✨', color: LIST_COLORS[0], archived: false, createdAt: Date.now() },
                    });
                }
            })
            .catch(() => {})
            .finally(() => setHydrated(true));
    }, []);

    useEffect(() => {
        if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, [state, hydrated]);

    const showSnackbar = useCallback((sb: Snackbar) => {
        if (timer.current) clearTimeout(timer.current);
        setSnackbar(sb);
        timer.current = setTimeout(() => setSnackbar(null), 4000);
    }, []);

    const dismissSnackbar = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setSnackbar(null);
    }, []);

    const deleteItemWithUndo = useCallback(
        (item: WishItem) => {
            dispatch({ type: 'DELETE_ITEM', payload: { id: item.id } });
            showSnackbar({ message: `Deleted "${item.title}"`, undo: () => dispatch({ type: 'RESTORE_ITEM', payload: item }) });
        },
        [showSnackbar]
    );

    const theme = state.settings.darkMode ? darkTheme : lightTheme;

    return (
        <AppContext.Provider
            value={{ state, dispatch, hydrated, theme, snackbar, showSnackbar, dismissSnackbar, deleteItemWithUndo }}
        >
            {children}
        </AppContext.Provider>
    );
};

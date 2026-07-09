
 * ✨ WISHLY — a massive single-file wishlist app
 * React Native + TypeScript, everything in one App.tsx
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
 *
 * Only external dependency:
 *   npm i @react-native-async-storage/async-storage
 * (Works great in an Expo project: npx create-expo-app -t expo-template-blank-typescript)
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ════════════════════════════════════════════════════════════════
   1. TYPES
   ════════════════════════════════════════════════════════════════ */

type Priority = 'low' | 'medium' | 'high' | 'dream';
type Category =
    | 'electronics' | 'fashion' | 'books' | 'home' | 'beauty'
    | 'sports' | 'travel' | 'gaming' | 'food' | 'other';
type SortMode = 'newest' | 'oldest' | 'priceAsc' | 'priceDesc' | 'priority' | 'alphabetical';
type FilterMode = 'all' | 'active' | 'purchased' | 'favorites';
type Currency = 'USD' | 'EUR' | 'GBP' | 'AMD' | 'RUB' | 'JPY';

interface WishItem {
    id: string;
    listId: string;
    title: string;
    description?: string;
    price: number;
    currency: Currency;
    url?: string;
    imageUrl?: string;
    priority: Priority;
    category: Category;
    tags: string[];
    quantity: number;
    notes?: string;
    purchased: boolean;
    purchasedAt?: number;
    favorite: boolean;
    createdAt: number;
    updatedAt: number;
}

interface WishList {
    id: string;
    name: string;
    emoji: string;
    color: string;
    budget?: number;
    archived: boolean;
    createdAt: number;
}

interface AppSettings {
    darkMode: boolean;
    defaultCurrency: Currency;
    compactMode: boolean;
}

interface AppState {
    lists: WishList[];
    items: WishItem[];
    settings: AppSettings;
}

type Action =
    | { type: 'HYDRATE'; payload: AppState }
    | { type: 'ADD_LIST'; payload: WishList }
    | { type: 'UPDATE_LIST'; payload: WishList }
    | { type: 'DELETE_LIST'; payload: { id: string } }
    | { type: 'TOGGLE_ARCHIVE_LIST'; payload: { id: string } }
    | { type: 'ADD_ITEM'; payload: WishItem }
    | { type: 'UPDATE_ITEM'; payload: WishItem }
    | { type: 'DELETE_ITEM'; payload: { id: string } }
    | { type: 'RESTORE_ITEM'; payload: WishItem }
    | { type: 'TOGGLE_PURCHASED'; payload: { id: string } }
    | { type: 'TOGGLE_FAVORITE'; payload: { id: string } }
    | { type: 'DUPLICATE_ITEM'; payload: { id: string; newId: string } }
    | { type: 'MOVE_ITEM'; payload: { id: string; targetListId: string } }
    | { type: 'CLEAR_PURCHASED'; payload: { listId: string } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    | { type: 'RESET_ALL' };

const PRIORITY_ORDER: Record<Priority, number> = { dream: 0, high: 1, medium: 2, low: 3 };
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'dream'];

const CATEGORY_EMOJI: Record<Category, string> = {
    electronics: '🔌', fashion: '👕', books: '📚', home: '🏠', beauty: '💄',
    sports: '⚽', travel: '✈️', gaming: '🎮', food: '🍕', other: '📦',
};
const CATEGORIES = Object.keys(CATEGORY_EMOJI) as Category[];

const CURRENCY_SYMBOL: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', AMD: '֏', RUB: '₽', JPY: '¥',
};
const CURRENCIES = Object.keys(CURRENCY_SYMBOL) as Currency[];

const LIST_COLORS = ['#3E6B5C', '#C98A2D', '#7A5CA8', '#C24545', '#3E5C8A', '#B0567E', '#5C8A3E', '#8A6A3E'];
const LIST_EMOJIS = ['✨', '🎁', '🎂', '🎄', '💍', '🏠', '👶', '🎓', '💻', '🧳'];

const PRIORITY_COLORS: Record<Priority, string> = {
    low: '#9B9285', medium: '#3E5C8A', high: '#C98A2D', dream: '#7A5CA8',
};

/* ════════════════════════════════════════════════════════════════
   2. THEME
   ════════════════════════════════════════════════════════════════ */

interface Theme {
    bg: string; surface: string; surfaceAlt: string; text: string; textMuted: string;
    border: string; accent: string; danger: string; success: string; warning: string;
}

const lightTheme: Theme = {
    bg: '#F7F4EF', surface: '#FFFFFF', surfaceAlt: '#EFEAE2', text: '#1E1B16',
    textMuted: '#7A7268', border: '#E3DCD1', accent: '#3E6B5C',
    danger: '#C24545', success: '#3E6B5C', warning: '#C98A2D',
};

const darkTheme: Theme = {
    bg: '#14120F', surface: '#1E1B17', surfaceAlt: '#28241F', text: '#F0EBE3',
    textMuted: '#9B9285', border: '#332E27', accent: '#6FA890',
    danger: '#E06C6C', success: '#6FA890', warning: '#E0A54E',
};

/* ════════════════════════════════════════════════════════════════
   3. HELPERS
   ════════════════════════════════════════════════════════════════ */

const generateId = (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

function formatPrice(amount: number, currency: Currency): string {
    const formatted = amount % 1 === 0
        ? amount.toLocaleString('en-US')
        : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${CURRENCY_SYMBOL[currency]}${formatted}`;
}

const formatDate = (ts: number): string =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function relativeDate(ts: number): string {
    const days = Math.floor((Date.now() - ts) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(ts);
}

function sortItems(items: WishItem[], mode: SortMode): WishItem[] {
    const c = [...items];
    switch (mode) {
        case 'newest': return c.sort((a, b) => b.createdAt - a.createdAt);
        case 'oldest': return c.sort((a, b) => a.createdAt - b.createdAt);
        case 'priceAsc': return c.sort((a, b) => a.price * a.quantity - b.price * b.quantity);
        case 'priceDesc': return c.sort((a, b) => b.price * b.quantity - a.price * a.quantity);
        case 'priority': return c.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case 'alphabetical': return c.sort((a, b) => a.title.localeCompare(b.title));
    }
}

function filterItems(items: WishItem[], mode: FilterMode): WishItem[] {
    switch (mode) {
        case 'active': return items.filter((i) => !i.purchased);
        case 'purchased': return items.filter((i) => i.purchased);
        case 'favorites': return items.filter((i) => i.favorite);
        default: return items;
    }
}

function searchItems(items: WishItem[], query: string): WishItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
        (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.description ?? '').toLowerCase().includes(q) ||
            (i.notes ?? '').toLowerCase().includes(q) ||
            i.tags.some((t) => t.includes(q)) ||
            i.category.includes(q)
    );
}

const priorityLabel = (p: Priority): string =>
    ({ low: 'Low', medium: 'Medium', high: 'High', dream: 'Dream' }[p]);

const parseTags = (raw: string): string[] =>
    raw.split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i)
        .slice(0, 10);

const isValidUrl = (url: string): boolean => /^https?:\/\/\S+\.\S+/.test(url.trim());

interface ListStats {
    totalItems: number; purchasedItems: number; totalValue: number;
    purchasedValue: number; remainingValue: number; progress: number; overBudget: boolean;
}

function computeListStats(list: WishList, items: WishItem[]): ListStats {
    const li = items.filter((i) => i.listId === list.id);
    const purchased = li.filter((i) => i.purchased);
    const totalValue = li.reduce((s, i) => s + i.price * i.quantity, 0);
    const purchasedValue = purchased.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
        totalItems: li.length,
        purchasedItems: purchased.length,
        totalValue,
        purchasedValue,
        remainingValue: totalValue - purchasedValue,
        progress: li.length ? purchased.length / li.length : 0,
        overBudget: list.budget != null && totalValue > list.budget,
    };
}

async function shareList(list: WishList, items: WishItem[]): Promise<void> {
    const lines = items
        .filter((i) => i.listId === list.id && !i.purchased)
        .map((i) => {
            const qty = i.quantity > 1 ? ` x${i.quantity}` : '';
            const url = i.url ? `\n   ${i.url}` : '';
            return `• ${i.title}${qty} — ${formatPrice(i.price, i.currency)} [${priorityLabel(i.priority)}]${url}`;
        });
    await Share.share({ message: `${list.emoji} ${list.name}\n\n${lines.join('\n')}\n\nShared from Wishly` });
}

/* ════════════════════════════════════════════════════════════════
   4. STATE (reducer + context + persistence + undo)
   ════════════════════════════════════════════════════════════════ */

const defaultSettings: AppSettings = { darkMode: false, defaultCurrency: 'USD', compactMode: false };
const initialState: AppState = { lists: [], items: [], settings: defaultSettings };
const STORAGE_KEY = '@wishly/state/v1';

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

interface Snackbar { message: string; undo?: () => void }

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

function useApp(): Ctx {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
}

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    const showSnackbar = useCallback((s: Snackbar) => {
        if (timer.current) clearTimeout(timer.current);
        setSnackbar(s);
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

/* ════════════════════════════════════════════════════════════════
   5. NAVIGATION (tiny built-in stack + tabs, no dependency)
   ════════════════════════════════════════════════════════════════ */

type Screen =
    | { name: 'listDetail'; listId: string }
    | { name: 'itemDetail'; itemId: string }
    | { name: 'itemForm'; listId: string; itemId?: string }
    | { name: 'listForm'; listId?: string };

type TabName = 'home' | 'stats' | 'settings';

interface Nav {
    tab: TabName;
    stack: Screen[];
    setTab: (t: TabName) => void;
    push: (s: Screen) => void;
    pop: () => void;
    popToRoot: () => void;
}

const NavContext = createContext<Nav | null>(null);
const useNav = (): Nav => {
    const ctx = useContext(NavContext);
    if (!ctx) throw new Error('useNav must be used inside NavProvider');
    return ctx;
};

const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

/* ════════════════════════════════════════════════════════════════
   6. SHARED UI COMPONENTS
   ════════════════════════════════════════════════════════════════ */

const hit = { top: 10, bottom: 10, left: 10, right: 10 };

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const color = PRIORITY_COLORS[priority];
    return (
        <View style={[s.badge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>
                {priority === 'dream' ? '💫 ' : ''}{priorityLabel(priority)}
            </Text>
        </View>
    );
};

const TagPill: React.FC<{ label: string }> = ({ label }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.tag, { backgroundColor: t.surfaceAlt }]}>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>#{label}</Text>
        </View>
    );
};

const ProgressBar: React.FC<{ progress: number; color?: string; height?: number }> = ({ progress, color, height = 6 }) => {
    const { theme: t } = useApp();
    const clamped = Math.min(Math.max(progress, 0), 1);
    return (
        <View style={[s.progressTrack, { backgroundColor: t.surfaceAlt, height }]}>
            <View style={{ width: `${clamped * 100}%`, backgroundColor: color ?? t.accent, height, borderRadius: height / 2 }} />
        </View>
    );
};

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
    const { theme: t } = useApp();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[s.chip, { backgroundColor: active ? t.accent : t.surface, borderColor: active ? t.accent : t.border }]}
        >
            <Text style={{ color: active ? '#fff' : t.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        </TouchableOpacity>
    );
};

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.search, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ fontSize: 15, marginRight: 6 }}>🔍</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Search items, tags, notes…"
                placeholderTextColor={t.textMuted}
                style={{ flex: 1, color: t.text, fontSize: 15, paddingVertical: 10 }}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')} hitSlop={hit}>
                    <Text style={{ color: t.textMuted, fontSize: 15 }}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const FAB: React.FC<{ onPress: () => void }> = ({ onPress }) => {
    const { theme: t } = useApp();
    return (
        <TouchableOpacity onPress={onPress} style={[s.fab, { backgroundColor: t.accent }]} accessibilityLabel="Add">
            <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>＋</Text>
        </TouchableOpacity>
    );
};

const EmptyState: React.FC<{ emoji: string; title: string; subtitle: string }> = ({ emoji, title, subtitle }) => {
    const { theme: t } = useApp();
    return (
        <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</Text>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center' }}>{subtitle}</Text>
        </View>
    );
};

const SnackbarView: React.FC = () => {
    const { theme: t, snackbar, dismissSnackbar } = useApp();
    if (!snackbar) return null;
    return (
        <View style={[s.snackbar, { backgroundColor: t.text }]}>
            <Text style={{ color: t.bg, flex: 1, fontSize: 14 }} numberOfLines={1}>{snackbar.message}</Text>
            {snackbar.undo && (
                <TouchableOpacity onPress={() => { snackbar.undo!(); dismissSnackbar(); }}>
                    <Text style={{ color: t.warning, fontWeight: '700', marginLeft: 16 }}>UNDO</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
    const { theme: t } = useApp();
    return <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
};

const Header: React.FC<{ title: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.header, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
            {onBack ? (
                <TouchableOpacity onPress={onBack} hitSlop={hit} style={{ width: 40 }}>
                    <Text style={{ color: t.accent, fontSize: 24 }}>‹</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ width: 40 }} />
            )}
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' }} numberOfLines={1}>
                {title}
            </Text>
            <View style={{ width: 40, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' }}>{right}</View>
        </View>
    );
};

const Label: React.FC<{ text: string; error?: string }> = ({ text, error }) => {
    const { theme: t } = useApp();
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: '700' }}>{text}</Text>
            {error && <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>}
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   7. ITEM CARD & LIST CARD
   ════════════════════════════════════════════════════════════════ */

const ItemCard: React.FC<{ item: WishItem }> = ({ item }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const compact = state.settings.compactMode;
    const total = item.price * item.quantity;

    return (
        <TouchableOpacity
            onPress={() => nav.push({ name: 'itemDetail', itemId: item.id })}
            activeOpacity={0.7}
            style={[s.itemCard, { backgroundColor: t.surface, borderColor: t.border, opacity: item.purchased ? 0.55 : 1 }]}
        >
            <TouchableOpacity
                onPress={() => dispatch({ type: 'TOGGLE_PURCHASED', payload: { id: item.id } })}
                style={{ marginRight: 10 }}
                hitSlop={hit}
            >
                <View
                    style={[
                        s.checkbox,
                        { borderColor: item.purchased ? t.success : t.border, backgroundColor: item.purchased ? t.success : 'transparent' },
                    ]}
                >
                    {item.purchased && <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>}
                </View>
            </TouchableOpacity>

            {!compact && item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.itemImage} />
            ) : (
                <View style={[s.emojiBox, { backgroundColor: t.surfaceAlt }]}>
                    <Text style={{ fontSize: compact ? 16 : 22 }}>{CATEGORY_EMOJI[item.category]}</Text>
                </View>
            )}

            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8,
                            color: t.text, textDecorationLine: item.purchased ? 'line-through' : 'none',
                        }}
                    >
                        {item.title}
                    </Text>
                    <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: { id: item.id } })} hitSlop={hit}>
                        <Text style={{ fontSize: 16 }}>{item.favorite ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                    {formatPrice(total, item.currency)}
                    {item.quantity > 1 && (
                        <Text style={{ color: t.textMuted, fontWeight: '400', fontSize: 12 }}>
                            {'  '}({item.quantity} × {formatPrice(item.price, item.currency)})
                        </Text>
                    )}
                </Text>

                {!compact && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <PriorityBadge priority={item.priority} />
                        <Text style={{ color: t.textMuted, fontSize: 11 }}>{relativeDate(item.createdAt)}</Text>
                    </View>
                )}

                {!compact && item.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                        {item.tags.slice(0, 3).map((tag) => <TagPill key={tag} label={tag} />)}
                        {item.tags.length > 3 && <Text style={{ color: t.textMuted, fontSize: 12 }}>+{item.tags.length - 3}</Text>}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const ListCard: React.FC<{ list: WishList }> = ({ list }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const stats = computeListStats(list, state.items);
    const currency = state.settings.defaultCurrency;

    const openMenu = () => {
        Alert.alert(list.name, undefined, [
            { text: 'Edit', onPress: () => nav.push({ name: 'listForm', listId: list.id }) },
            { text: 'Share', onPress: () => shareList(list, state.items) },
            {
                text: list.archived ? 'Unarchive' : 'Archive',
                onPress: () => dispatch({ type: 'TOGGLE_ARCHIVE_LIST', payload: { id: list.id } }),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                    Alert.alert('Delete list?', 'All items inside will be deleted too.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIST', payload: { id: list.id } }) },
                    ]),
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <TouchableOpacity
            onPress={() => nav.push({ name: 'listDetail', listId: list.id })}
            onLongPress={openMenu}
            activeOpacity={0.7}
            style={[s.listCard, { backgroundColor: t.surface, borderColor: t.border }]}
        >
            <View style={{ width: 6, backgroundColor: list.color }} />
            <View style={{ flex: 1, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, marginRight: 8 }}>{list.emoji}</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: t.text, flexShrink: 1 }} numberOfLines={1}>
                        {list.name}
                    </Text>
                    {list.archived && <Text style={{ color: t.textMuted, fontSize: 11, marginLeft: 8 }}>archived</Text>}
                </View>

                <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>
                    {stats.purchasedItems}/{stats.totalItems} purchased · {formatPrice(stats.remainingValue, currency)} to go
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <ProgressBar progress={stats.progress} color={list.color} />
                    <Text style={{ color: t.textMuted, fontSize: 12, marginLeft: 8 }}>{Math.round(stats.progress * 100)}%</Text>
                </View>

                {list.budget != null && (
                    <Text style={{ color: stats.overBudget ? t.danger : t.textMuted, fontSize: 12, marginTop: 6 }}>
                        Budget: {formatPrice(stats.totalValue, currency)} / {formatPrice(list.budget, currency)}
                        {stats.overBudget ? ' — over budget!' : ''}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

/* ════════════════════════════════════════════════════════════════
   8. HOME SCREEN
   ════════════════════════════════════════════════════════════════ */

const HomeScreen: React.FC = () => {
    const { state, theme: t } = useApp();
    const nav = useNav();
    const [showArchived, setShowArchived] = useState(false);

    const lists = useMemo(
        () =>
            state.lists
                .filter((l) => (showArchived ? l.archived : !l.archived))
                .sort((a, b) => b.createdAt - a.createdAt),
        [state.lists, showArchived]
    );

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={s.homeHeader}>
                <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: t.text }}>Wishly</Text>
                <View style={{ flexDirection: 'row' }}>
                    <Chip label="Active" active={!showArchived} onPress={() => setShowArchived(false)} />
                    <Chip label="Archived" active={showArchived} onPress={() => setShowArchived(true)} />
                </View>
            </View>

            <FlatList
                data={lists}
                keyExtractor={(l: WishList) => l.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <EmptyState
                        emoji={showArchived ? '🗄️' : '🎁'}
                        title={showArchived ? 'No archived lists' : 'No lists yet'}
                        subtitle={showArchived ? 'Archived lists will appear here.' : 'Create your first wishlist with the + button. Long-press a list for more actions.'}
                    />
                }
                renderItem={({ item }: { item: WishList }) => <ListCard list={item} />}
            />

            <FAB onPress={() => nav.push({ name: 'listForm' })} />
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   9. LIST DETAIL SCREEN
   ════════════════════════════════════════════════════════════════ */

const SORT_LABELS: Record<SortMode, string> = {
    newest: 'Newest', oldest: 'Oldest', priceAsc: 'Price ↑',
    priceDesc: 'Price ↓', priority: 'Priority', alphabetical: 'A–Z',
};
const SORT_ORDER: SortMode[] = ['newest', 'oldest', 'priceAsc', 'priceDesc', 'priority', 'alphabetical'];
const FILTERS: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'purchased', label: 'Purchased' },
    { key: 'favorites', label: '❤️ Favorites' },
];

const ListDetailScreen: React.FC<{ listId: string }> = ({ listId }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('newest');
    const [filter, setFilter] = useState<FilterMode>('all');

    const list = state.lists.find((l) => l.id === listId);

    const items = useMemo(() => {
        let r = state.items.filter((i) => i.listId === listId);
        r = filterItems(r, filter);
        r = searchItems(r, query);
        return sortItems(r, sort);
    }, [state.items, listId, filter, query, sort]);

    if (!list) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <Header title="List" onBack={nav.pop} />
                <EmptyState emoji="🫥" title="List not found" subtitle="It may have been deleted." />
            </View>
        );
    }

    const stats = computeListStats(list, state.items);
    const cycleSort = () => setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length]);

    const clearPurchased = () =>
        Alert.alert('Clear purchased?', 'Removes all purchased items from this list.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => dispatch({ type: 'CLEAR_PURCHASED', payload: { listId } }) },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <Header
                title={`${list.emoji} ${list.name}`}
                onBack={nav.pop}
                right={
                    <>
                        <TouchableOpacity onPress={() => shareList(list, state.items)} style={{ marginRight: 14 }} hitSlop={hit}>
                            <Text style={{ fontSize: 17 }}>📤</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => nav.push({ name: 'listForm', listId })} hitSlop={hit}>
                            <Text style={{ fontSize: 17 }}>✏️</Text>
                        </TouchableOpacity>
                    </>
                }
            />

            <View style={{ padding: 16, paddingBottom: 8 }}>
                <View style={[s.summary, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textMuted, fontSize: 12 }}>Remaining</Text>
                        <Text style={{ color: t.text, fontSize: 20, fontWeight: '900' }}>
                            {formatPrice(stats.remainingValue, state.settings.defaultCurrency)}
                        </Text>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 12 }}>
                        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
                            {stats.purchasedItems}/{stats.totalItems} purchased
                        </Text>
                        <ProgressBar progress={stats.progress} color={list.color} height={8} />
                    </View>
                </View>

                <SearchBar value={query} onChange={setQuery} />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ alignItems: 'center' }}>
                    {FILTERS.map((f) => (
                        <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
                    ))}
                    <Chip label={`Sort: ${SORT_LABELS[sort]}`} active={false} onPress={cycleSort} />
                    {stats.purchasedItems > 0 && <Chip label="Clear purchased" active={false} onPress={clearPurchased} />}
                </ScrollView>
            </View>

            <FlatList
                data={items}
                keyExtractor={(i: WishItem) => i.id}
                contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
                ListEmptyComponent={
                    <EmptyState
                        emoji={query ? '🔎' : '🌱'}
                        title={query ? 'Nothing found' : 'No items yet'}
                        subtitle={query ? 'Try a different search.' : 'Tap + to add your first wish.'}
                    />
                }
                renderItem={({ item }: { item: WishItem }) => <ItemCard item={item} />}
            />

            <FAB onPress={() => nav.push({ name: 'itemForm', listId })} />
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   10. ITEM FORM SCREEN (add / edit)
   ════════════════════════════════════════════════════════════════ */

const ItemFormScreen: React.FC<{ listId: string; itemId?: string }> = ({ listId, itemId }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();

    const editing = itemId ? state.items.find((i) => i.id === itemId) : undefined;

    const [title, setTitle] = useState(editing?.title ?? '');
    const [description, setDescription] = useState(editing?.description ?? '');
    const [price, setPrice] = useState(editing ? String(editing.price) : '');
    const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
    const [currency, setCurrency] = useState<Currency>(editing?.currency ?? state.settings.defaultCurrency);
    const [url, setUrl] = useState(editing?.url ?? '');
    const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? '');
    const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium');
    const [category, setCategory] = useState<Category>(editing?.category ?? 'other');
    const [tagsRaw, setTagsRaw] = useState(editing?.tags.join(', ') ?? '');
    const [notes, setNotes] = useState(editing?.notes ?? '');
    const [errors, setErrors] = useState<{ title?: string; price?: string; url?: string }>({});

    const validate = (): boolean => {
        const next: typeof errors = {};
        if (!title.trim()) next.title = 'Name your wish';
        const parsed = parseFloat(price.replace(',', '.'));
        if (price.trim() && (isNaN(parsed) || parsed < 0)) next.price = 'Enter a valid price';
        if (url.trim() && !isValidUrl(url)) next.url = 'Must start with http(s)://';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const save = () => {
        if (!validate()) return;
        const now = Date.now();
        const item: WishItem = {
            id: editing?.id ?? generateId(),
            listId: editing?.listId ?? listId,
            title: title.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price.replace(',', '.')) || 0,
            currency,
            url: url.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            priority,
            category,
            tags: parseTags(tagsRaw),
            quantity,
            notes: notes.trim() || undefined,
            purchased: editing?.purchased ?? false,
            purchasedAt: editing?.purchasedAt,
            favorite: editing?.favorite ?? false,
            createdAt: editing?.createdAt ?? now,
            updatedAt: now,
        };
        dispatch({ type: editing ? 'UPDATE_ITEM' : 'ADD_ITEM', payload: item });
        nav.pop();
    };

    const input = [s.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header title={editing ? 'Edit item' : 'New item'} onBack={nav.pop} />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                <Label text="Title *" error={errors.title} />
                <TextInput style={input} value={title} onChangeText={setTitle} placeholder="What do you wish for?" placeholderTextColor={t.textMuted} />

                <Label text="Description" />
                <TextInput
                    style={[...input, { height: 72, textAlignVertical: 'top' as const }]}
                    value={description} onChangeText={setDescription}
                    placeholder="Color, size, model…" placeholderTextColor={t.textMuted} multiline
                />

                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 2, marginRight: 10 }}>
                        <Label text="Price" error={errors.price} />
                        <TextInput style={input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Label text="Qty" />
                        <View style={[s.stepper, { backgroundColor: t.surface, borderColor: t.border }]}>
                            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} hitSlop={hit}>
                                <Text style={{ fontSize: 18, fontWeight: '800', paddingHorizontal: 6, color: t.accent }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ color: t.text, fontWeight: '700' }}>{quantity}</Text>
                            <TouchableOpacity onPress={() => setQuantity(Math.min(99, quantity + 1))} hitSlop={hit}>
                                <Text style={{ fontSize: 18, fontWeight: '800', paddingHorizontal: 6, color: t.accent }}>＋</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <Label text="Currency" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CURRENCIES.map((c) => (
                        <Chip key={c} label={`${CURRENCY_SYMBOL[c]} ${c}`} active={currency === c} onPress={() => setCurrency(c)} />
                    ))}
                </ScrollView>

                <Label text="Priority" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {PRIORITIES.map((p) => (
                        <Chip key={p} label={p === 'dream' ? '💫 Dream' : priorityLabel(p)} active={priority === p} onPress={() => setPriority(p)} />
                    ))}
                </View>

                <Label text="Category" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {CATEGORIES.map((c) => (
                        <Chip key={c} label={`${CATEGORY_EMOJI[c]} ${c}`} active={category === c} onPress={() => setCategory(c)} />
                    ))}
                </View>

                <Label text="Link" error={errors.url} />
                <TextInput style={input} value={url} onChangeText={setUrl} placeholder="https://store.example/item" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="url" />

                <Label text="Image URL" />
                <TextInput style={input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://…/photo.jpg" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="url" />

                <Label text="Tags (comma separated)" />
                <TextInput style={input} value={tagsRaw} onChangeText={setTagsRaw} placeholder="birthday, tech, sale" placeholderTextColor={t.textMuted} autoCapitalize="none" />

                <Label text="Notes" />
                <TextInput
                    style={[...input, { height: 72, textAlignVertical: 'top' as const }]}
                    value={notes} onChangeText={setNotes}
                    placeholder="Anything to remember…" placeholderTextColor={t.textMuted} multiline
                />

                <TouchableOpacity style={[s.saveBtn, { backgroundColor: t.accent }]} onPress={save}>
                    <Text style={s.saveText}>{editing ? 'Save changes' : 'Add to wishlist'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

/* ════════════════════════════════════════════════════════════════
   11. ITEM DETAIL SCREEN
   ════════════════════════════════════════════════════════════════ */

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const { theme: t } = useApp();
    return (
        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Text style={{ color: t.textMuted, fontSize: 13, width: 90 }}>{label}</Text>
            <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{value}</Text>
        </View>
    );
};

const SmallAction: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
    const { theme: t } = useApp();
    return (
        <TouchableOpacity style={[s.smallBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={onPress}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        </TouchableOpacity>
    );
};

const ItemDetailScreen: React.FC<{ itemId: string }> = ({ itemId }) => {
    const { state, dispatch, theme: t, deleteItemWithUndo } = useApp();
    const nav = useNav();

    const item = state.items.find((i) => i.id === itemId);
    const list = item ? state.lists.find((l) => l.id === item.listId) : undefined;

    if (!item) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <Header title="Item" onBack={nav.pop} />
                <EmptyState emoji="🫥" title="Item not found" subtitle="It may have been deleted." />
            </View>
        );
    }

    const moveItem = () => {
        const targets = state.lists.filter((l) => l.id !== item.listId && !l.archived);
        if (targets.length === 0) {
            Alert.alert('No other lists', 'Create another list first.');
            return;
        }
        Alert.alert('Move to…', undefined, [
            ...targets.map((l) => ({
                text: `${l.emoji} ${l.name}`,
                onPress: () => {
                    dispatch({ type: 'MOVE_ITEM', payload: { id: item.id, targetListId: l.id } });
                    nav.pop();
                },
            })),
            { text: 'Cancel', style: 'cancel' as const },
        ]);
    };

    const confirmDelete = () =>
        Alert.alert('Delete item?', `"${item.title}" will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => { deleteItemWithUndo(item); nav.pop(); },
            },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <Header
                title={item.title}
                onBack={nav.pop}
                right={
                    <TouchableOpacity onPress={() => nav.push({ name: 'itemForm', listId: item.listId, itemId: item.id })} hitSlop={hit}>
                        <Text style={{ fontSize: 17 }}>✏️</Text>
                    </TouchableOpacity>
                }
            />
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s.detailImage} />
                ) : (
                    <View style={[s.detailPlaceholder, { backgroundColor: t.surfaceAlt }]}>
                        <Text style={{ fontSize: 56 }}>{CATEGORY_EMOJI[item.category]}</Text>
                    </View>
                )}

                <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 26, fontWeight: '900', color: t.accent }}>
                            {formatPrice(item.price * item.quantity, item.currency)}
                        </Text>
                        <PriorityBadge priority={item.priority} />
                    </View>
                    {item.quantity > 1 && (
                        <Text style={{ color: t.textMuted, fontSize: 13 }}>
                            {item.quantity} × {formatPrice(item.price, item.currency)}
                        </Text>
                    )}
                    {item.description && (
                        <Text style={{ color: t.text, fontSize: 15, marginTop: 10, lineHeight: 22 }}>{item.description}</Text>
                    )}
                    {item.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                            {item.tags.map((tag) => <TagPill key={tag} label={tag} />)}
                        </View>
                    )}
                </Card>

                <Card>
                    <InfoRow label="List" value={list ? `${list.emoji} ${list.name}` : '—'} />
                    <InfoRow label="Category" value={`${CATEGORY_EMOJI[item.category]} ${item.category}`} />
                    <InfoRow label="Added" value={formatDate(item.createdAt)} />
                    {item.purchased && item.purchasedAt && <InfoRow label="Purchased" value={formatDate(item.purchasedAt)} />}
                    {item.notes && <InfoRow label="Notes" value={item.notes} />}
                </Card>

                {item.url && (
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: t.accent }]} onPress={() => Linking.openURL(item.url!)}>
                        <Text style={s.actionText}>🔗 Open store link</Text>
                    </TouchableOpacity>
                )}

                <View style={s.actionsRow}>
                    <SmallAction
                        label={item.purchased ? 'Mark active' : 'Mark bought'}
                        onPress={() => dispatch({ type: 'TOGGLE_PURCHASED', payload: { id: item.id } })}
                    />
                    <SmallAction
                        label={item.favorite ? 'Unfavorite' : 'Favorite'}
                        onPress={() => dispatch({ type: 'TOGGLE_FAVORITE', payload: { id: item.id } })}
                    />
                </View>
                <View style={s.actionsRow}>
                    <SmallAction
                        label="Duplicate"
                        onPress={() => dispatch({ type: 'DUPLICATE_ITEM', payload: { id: item.id, newId: generateId() } })}
                    />
                    <SmallAction label="Move to list…" onPress={moveItem} />
                </View>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }} onPress={confirmDelete}>
                    <Text style={{ color: t.danger, fontWeight: '700' }}>Delete item</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   12. LIST FORM SCREEN (create / edit list)
   ════════════════════════════════════════════════════════════════ */

const ListFormScreen: React.FC<{ listId?: string }> = ({ listId }) => {
    const { state, dispatch, theme: t } = useApp();
    const nav = useNav();

    const editing = listId ? state.lists.find((l) => l.id === listId) : undefined;

    const [name, setName] = useState(editing?.name ?? '');
    const [emoji, setEmoji] = useState(editing?.emoji ?? LIST_EMOJIS[0]);
    const [color, setColor] = useState(editing?.color ?? LIST_COLORS[0]);
    const [budget, setBudget] = useState(editing?.budget != null ? String(editing.budget) : '');
    const [error, setError] = useState('');

    const save = () => {
        if (!name.trim()) { setError('Give your list a name'); return; }
        const parsedBudget = parseFloat(budget.replace(',', '.'));
        const list: WishList = {
            id: editing?.id ?? generateId(),
            name: name.trim(),
            emoji,
            color,
            budget: budget.trim() && !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
            archived: editing?.archived ?? false,
            createdAt: editing?.createdAt ?? Date.now(),
        };
        dispatch({ type: editing ? 'UPDATE_LIST' : 'ADD_LIST', payload: list });
        nav.pop();
    };

    const input = [s.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header title={editing ? 'Edit list' : 'New list'} onBack={nav.pop} />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
                <Label text="Name *" error={error} />
                <TextInput
                    style={input} value={name}
                    onChangeText={(v: string) => { setName(v); if (error) setError(''); }}
                    placeholder="Birthday, Christmas, Dream setup…" placeholderTextColor={t.textMuted}
                />

                <Label text="Emoji" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                    {LIST_EMOJIS.map((e) => (
                        <TouchableOpacity
                            key={e}
                            onPress={() => setEmoji(e)}
                            style={[
                                s.emojiPick,
                                { backgroundColor: emoji === e ? t.accent + '33' : t.surface, borderColor: emoji === e ? t.accent : t.border },
                            ]}
                        >
                            <Text style={{ fontSize: 22 }}>{e}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Label text="Color" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
                    {LIST_COLORS.map((c) => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setColor(c)}
                            style={[s.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: t.text }]}
                        />
                    ))}
                </View>

                <Label text={`Budget (optional, ${state.settings.defaultCurrency})`} />
                <TextInput style={input} value={budget} onChangeText={setBudget} placeholder="e.g. 500" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />

                <TouchableOpacity style={[s.saveBtn, { backgroundColor: t.accent }]} onPress={save}>
                    <Text style={s.saveText}>{editing ? 'Save changes' : 'Create list'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

/* ════════════════════════════════════════════════════════════════
   13. STATS SCREEN
   ════════════════════════════════════════════════════════════════ */

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.statBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{label}</Text>
        </View>
    );
};

const StatsScreen: React.FC = () => {
    const { state, theme: t } = useApp();
    const nav = useNav();

    const stats = useMemo(() => {
        const activeIds = new Set(state.lists.filter((l) => !l.archived).map((l) => l.id));
        const visible = state.items.filter((i) => activeIds.has(i.listId));

        const totalsByCurrency: Partial<Record<Currency, number>> = {};
        for (const i of visible) {
            totalsByCurrency[i.currency] = (totalsByCurrency[i.currency] ?? 0) + i.price * i.quantity;
        }

        const catMap = new Map<Category, { count: number; value: number }>();
        for (const i of visible) {
            const e = catMap.get(i.category) ?? { count: 0, value: 0 };
            e.count += 1;
            e.value += i.price * i.quantity;
            catMap.set(i.category, e);
        }
        const byCategory = [...catMap.entries()]
            .map(([category, v]) => ({ category, ...v }))
            .sort((a, b) => b.value - a.value);
        const maxCatValue = byCategory[0]?.value ?? 1;

        const unpurchased = visible.filter((i) => !i.purchased);

        return {
            totalItems: visible.length,
            totalLists: state.lists.filter((l) => !l.archived).length,
            purchasedCount: visible.filter((i) => i.purchased).length,
            favoriteCount: visible.filter((i) => i.favorite).length,
            totalsByCurrency,
            byCategory,
            maxCatValue,
            mostExpensive: [...visible].sort((a, b) => b.price * b.quantity - a.price * a.quantity)[0],
            oldestUnpurchased: [...unpurchased].sort((a, b) => a.createdAt - b.createdAt)[0],
        };
    }, [state.lists, state.items]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={s.homeHeader}>
                <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: t.text }}>Stats</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <StatBox label="Lists" value={String(stats.totalLists)} />
                    <StatBox label="Items" value={String(stats.totalItems)} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <StatBox label="Purchased" value={String(stats.purchasedCount)} />
                    <StatBox label="Favorites" value={String(stats.favoriteCount)} />
                </View>

                {Object.keys(stats.totalsByCurrency).length > 0 && (
                    <Card style={{ marginTop: 16 }}>
                        <Text style={{ color: t.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>Total wishlist value</Text>
                        {(Object.entries(stats.totalsByCurrency) as [Currency, number][]).map(([cur, val]) => (
                            <View key={cur} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                                <Text style={{ color: t.textMuted }}>{cur}</Text>
                                <Text style={{ color: t.accent, fontWeight: '800' }}>{formatPrice(val, cur)}</Text>
                            </View>
                        ))}
                    </Card>
                )}

                {stats.byCategory.length > 0 && (
                    <Card style={{ marginTop: 4 }}>
                        <Text style={{ color: t.text, fontWeight: '800', fontSize: 15, marginBottom: 10 }}>By category</Text>
                        {stats.byCategory.map((c) => (
                            <View key={c.category} style={{ marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ color: t.text, fontSize: 13 }}>
                                        {CATEGORY_EMOJI[c.category]} {c.category} · {c.count}
                                    </Text>
                                    <Text style={{ color: t.textMuted, fontSize: 13 }}>
                                        {formatPrice(c.value, state.settings.defaultCurrency)}
                                    </Text>
                                </View>
                                <ProgressBar progress={c.value / stats.maxCatValue} />
                            </View>
                        ))}
                    </Card>
                )}

                {stats.mostExpensive && (
                    <Card style={{ marginTop: 4 }}>
                        <Text style={{ color: t.text, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>Records</Text>
                        <TouchableOpacity onPress={() => nav.push({ name: 'itemDetail', itemId: stats.mostExpensive!.id })}>
                            <Text style={{ color: t.textMuted, fontSize: 13 }}>💸 Most expensive</Text>
                            <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>
                                {stats.mostExpensive.title} — {formatPrice(stats.mostExpensive.price * stats.mostExpensive.quantity, stats.mostExpensive.currency)}
                            </Text>
                        </TouchableOpacity>
                        {stats.oldestUnpurchased && (
                            <TouchableOpacity onPress={() => nav.push({ name: 'itemDetail', itemId: stats.oldestUnpurchased!.id })}>
                                <Text style={{ color: t.textMuted, fontSize: 13 }}>⏳ Waiting the longest</Text>
                                <Text style={{ color: t.text, fontWeight: '700' }}>
                                    {stats.oldestUnpurchased.title} — since {formatDate(stats.oldestUnpurchased.createdAt)}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Card>
                )}

                {stats.totalItems === 0 && (
                    <EmptyState emoji="📊" title="No data yet" subtitle="Add some wishes and your stats will bloom here." />
                )}
            </ScrollView>
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   14. SETTINGS SCREEN
   ════════════════════════════════════════════════════════════════ */

const SettingRow: React.FC<{ label: string; sub?: string; children: React.ReactNode }> = ({ label, sub, children }) => {
    const { theme: t } = useApp();
    return (
        <View style={s.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
                {sub && <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{sub}</Text>}
            </View>
            {children}
        </View>
    );
};

const SettingsScreen: React.FC = () => {
    const { state, dispatch, theme: t } = useApp();
    const settings = state.settings;

    const resetAll = () =>
        Alert.alert('Delete everything?', 'All lists and items will be permanently removed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete all', style: 'destructive', onPress: () => dispatch({ type: 'RESET_ALL' }) },
        ]);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <View style={s.homeHeader}>
                <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: t.text }}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <Card>
                    <SettingRow label="Dark mode" sub="Easier on the eyes at night">
                        <Switch
                            value={settings.darkMode}
                            onValueChange={(v: boolean) => dispatch({ type: 'UPDATE_SETTINGS', payload: { darkMode: v } })}
                            trackColor={{ true: t.accent }}
                        />
                    </SettingRow>
                    <SettingRow label="Compact items" sub="Smaller cards, more on screen">
                        <Switch
                            value={settings.compactMode}
                            onValueChange={(v: boolean) => dispatch({ type: 'UPDATE_SETTINGS', payload: { compactMode: v } })}
                            trackColor={{ true: t.accent }}
                        />
                    </SettingRow>
                </Card>

                <Card>
                    <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>Default currency</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                        {CURRENCIES.map((c) => (
                            <Chip
                                key={c}
                                label={`${CURRENCY_SYMBOL[c]} ${c}`}
                                active={settings.defaultCurrency === c}
                                onPress={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultCurrency: c } })}
                            />
                        ))}
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 10 }}>
                        Used for new items, list budgets and totals.
                    </Text>
                </Card>

                <Card>
                    <TouchableOpacity onPress={resetAll}>
                        <Text style={{ color: t.danger, fontWeight: '700', fontSize: 15 }}>Delete all data</Text>
                        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                            Removes every list and item. Settings are kept.
                        </Text>
                    </TouchableOpacity>
                </Card>

                <Text style={{ color: t.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                    Wishly · single-file edition · data stays on your device
                </Text>
            </ScrollView>
        </View>
    );
};

/* ════════════════════════════════════════════════════════════════
   15. TAB BAR + ROUTER + APP ROOT
   ════════════════════════════════════════════════════════════════ */

const TABS: { key: TabName; label: string; emoji: string }[] = [
    { key: 'home', label: 'Lists', emoji: '📝' },
    { key: 'stats', label: 'Stats', emoji: '📊' },
    { key: 'settings', label: 'Settings', emoji: '⚙️' },
];

const TabBar: React.FC = () => {
    const { theme: t } = useApp();
    const nav = useNav();
    return (
        <View style={[s.tabBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
            {TABS.map((tab) => {
                const active = nav.tab === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={s.tabBtn}
                        onPress={() => { nav.setTab(tab.key); nav.popToRoot(); }}
                    >
                        <Text style={{ fontSize: 20, opacity: active ? 1 : 0.4 }}>{tab.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: active ? t.accent : t.textMuted }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const Router: React.FC = () => {
    const nav = useNav();
    const top = nav.stack[nav.stack.length - 1];

    if (top) {
        switch (top.name) {
            case 'listDetail': return <ListDetailScreen listId={top.listId} />;
            case 'itemDetail': return <ItemDetailScreen itemId={top.itemId} />;
            case 'itemForm': return <ItemFormScreen listId={top.listId} itemId={top.itemId} />;
            case 'listForm': return <ListFormScreen listId={top.listId} />;
        }
    }

    switch (nav.tab) {
        case 'stats': return <StatsScreen />;
        case 'settings': return <SettingsScreen />;
        default: return <HomeScreen />;
    }
};

const AppShell: React.FC = () => {
    const { theme: t, hydrated, state } = useApp();
    const nav = useNav();
    const showTabBar = nav.stack.length === 0;

    if (!hydrated) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>✨</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
            <StatusBar barStyle={state.settings.darkMode ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
            <View style={{ flex: 1 }}>
                <Router />
                <SnackbarView />
            </View>
            {showTabBar && <TabBar />}
        </SafeAreaView>
    );
};

export default function App(): React.JSX.Element {
    return (
        <AppProvider>
            <NavProvider>
                <AppShell />
            </NavProvider>
        </AppProvider>
    );
}

/* ════════════════════════════════════════════════════════════════
   16. STYLES
   ════════════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginRight: 6, marginBottom: 6 },
    progressTrack: { borderRadius: 999, overflow: 'hidden', flex: 1 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginRight: 8 },
    search: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
    fab: {
        position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
    snackbar: {
        position: 'absolute', left: 16, right: 16, bottom: 24, borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', elevation: 6,
    },
    card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        paddingVertical: 12, borderBottomWidth: 1,
    },
    homeHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },
    itemCard: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
        padding: 12, marginBottom: 10,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    itemImage: { width: 52, height: 52, borderRadius: 12 },
    emojiBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    listCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
    summary: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
        padding: 14, marginBottom: 12,
    },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
    stepper: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
    },
    saveBtn: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    detailImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 14 },
    detailPlaceholder: {
        width: '100%', height: 160, borderRadius: 20, alignItems: 'center',
        justifyContent: 'center', marginBottom: 14,
    },
    actionBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
    actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    smallBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
    emojiPick: {
        width: 48, height: 48, borderRadius: 12, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
    },
    colorDot: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 8,
    },
    tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingBottom: 6 },
    tabBtn: { flex: 1, alignItems: 'center' },
});

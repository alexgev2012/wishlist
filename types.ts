export type Priority = 'low' | 'medium' | 'high' | 'dream';
export type Category =
    | 'electronics' | 'fashion' | 'books' | 'home' | 'beauty'
    | 'sports' | 'travel' | 'gaming' | 'food' | 'other';
export type SortMode = 'newest' | 'oldest' | 'priceAsc' | 'priceDesc' | 'priority' | 'alphabetical';
export type FilterMode = 'all' | 'active' | 'purchased' | 'favorites';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'AMD' | 'RUB' | 'JPY';

export interface WishItem {
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

export interface WishList {
    id: string;
    name: string;
    emoji: string;
    color: string;
    budget?: number;
    archived: boolean;
    createdAt: number;
}

export interface AppSettings {
    darkMode: boolean;
    defaultCurrency: Currency;
    compactMode: boolean;
}

export interface AppState {
    lists: WishList[];
    items: WishItem[];
    settings: AppSettings;
}

export type Action =
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

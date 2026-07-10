import { Share } from 'react-native';

import { CURRENCY_SYMBOL, PRIORITY_ORDER } from '@/constants';
import type { Currency, FilterMode, Priority, SortMode, WishItem, WishList } from '@/types';

export const generateId = (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function formatPrice(amount: number, currency: Currency): string {
    const formatted = amount % 1 === 0
        ? amount.toLocaleString('en-US')
        : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${CURRENCY_SYMBOL[currency]}${formatted}`;
}

export const formatDate = (ts: number): string =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function relativeDate(ts: number): string {
    const days = Math.floor((Date.now() - ts) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(ts);
}

export function sortItems(items: WishItem[], mode: SortMode): WishItem[] {
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

export function filterItems(items: WishItem[], mode: FilterMode): WishItem[] {
    switch (mode) {
        case 'active': return items.filter((i) => !i.purchased);
        case 'purchased': return items.filter((i) => i.purchased);
        case 'favorites': return items.filter((i) => i.favorite);
        default: return items;
    }
}

export function searchItems(items: WishItem[], query: string): WishItem[] {
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

export const priorityLabel = (p: Priority): string =>
    ({ low: 'Low', medium: 'Medium', high: 'High', dream: 'Dream' }[p]);

export const parseTags = (raw: string): string[] =>
    raw.split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i)
        .slice(0, 10);

export const isValidUrl = (url: string): boolean => /^https?:\/\/\S+\.\S+/.test(url.trim());

export interface ListStats {
    totalItems: number; purchasedItems: number; totalValue: number;
    purchasedValue: number; remainingValue: number; progress: number; overBudget: boolean;
}

export function computeListStats(list: WishList, items: WishItem[]): ListStats {
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

export async function shareList(list: WishList, items: WishItem[]): Promise<void> {
    const lines = items
        .filter((i) => i.listId === list.id && !i.purchased)
        .map((i) => {
            const qty = i.quantity > 1 ? ` x${i.quantity}` : '';
            const url = i.url ? `\n   ${i.url}` : '';
            return `• ${i.title}${qty} — ${formatPrice(i.price, i.currency)} [${priorityLabel(i.priority)}]${url}`;
        });
    await Share.share({ message: `${list.emoji} ${list.name}\n\n${lines.join('\n')}\n\nShared from Wishly` });
}

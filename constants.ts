import type { Category, Currency, Priority } from '@/types';

export const PRIORITY_ORDER: Record<Priority, number> = { dream: 0, high: 1, medium: 2, low: 3 };
export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'dream'];

export const CATEGORY_EMOJI: Record<Category, string> = {
    electronics: '🔌', fashion: '👕', books: '📚', home: '🏠', beauty: '💄',
    sports: '⚽', travel: '✈️', gaming: '🎮', food: '🍕', other: '📦',
};
export const CATEGORIES = Object.keys(CATEGORY_EMOJI) as Category[];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
    USD: '$', EUR: '€', GBP: '£', AMD: '֏', RUB: '₽', JPY: '¥',
};
export const CURRENCIES = Object.keys(CURRENCY_SYMBOL) as Currency[];

export const LIST_COLORS = ['#3E6B5C', '#C98A2D', '#7A5CA8', '#C24545', '#3E5C8A', '#B0567E', '#5C8A3E', '#8A6A3E'];
export const LIST_EMOJIS = ['✨', '🎁', '🎂', '🎄', '💍', '🏠', '👶', '🎓', '💻', '🧳'];

export const PRIORITY_COLORS: Record<Priority, string> = {
    low: '#9B9285', medium: '#3E5C8A', high: '#C98A2D', dream: '#7A5CA8',
};

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Card, EmptyState, ProgressBar } from '@/components/shared';
import { CATEGORY_EMOJI } from '@/constants';
import { useNav } from '@/navigation/NavState';
import { useApp } from '@/state/AppState';
import { s } from '@/styles';
import type { Category, Currency } from '@/types';
import { formatDate, formatPrice } from '@/utils';

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const { theme: t } = useApp();
    return (
        <View style={[s.statBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{label}</Text>
        </View>
    );
};

export const StatsScreen: React.FC = () => {
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
